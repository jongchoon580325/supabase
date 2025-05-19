"use client";
import Image from 'next/image'
import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
// @ts-ignore: papaparse 타입이 없을 수 있음
import * as Papa from 'papaparse'; // CSV 파싱용
import type { ParseResult } from 'papaparse';
const AVATAR_PLACEHOLDER = 'https://ui-avatars.com/api/?name=Profile&background=random';

export default function Home() {
  // 입력폼 상태 관리
  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    zipcode: '',
    address: '',
    image_url: '',
  });
  // 로딩 및 에러 상태
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // 명함 목록 상태
  const [cards, setCards] = useState<any[]>([]);
  const [fetching, setFetching] = useState(false);
  const [nameSuggestions, setNameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<typeof form | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [showFavoriteOnly, setShowFavoriteOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1); // 페이지네이션 상태
  const CARDS_PER_PAGE = 16; // 4x4
  // 모달 상태
  const [modal, setModal] = useState<{ open: boolean, type: 'reset' | 'import' | 'export' | 'delete' | null, message?: string, cardId?: number }>({ open: false, type: null });

  // 명함 목록 불러오기
  const fetchCards = async () => {
    setFetching(true);
    const { data, error } = await supabase.from('supabase').select('*').order('id', { ascending: false });
    if (!error && data) setCards(data);
    setFetching(false);
    if (data) setNameSuggestions(Array.from(new Set(data.map((c: any) => c.name).filter(Boolean))));
  };

  useEffect(() => {
    fetchCards();
  }, []);

  // 입력값 변경 핸들러
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') setShowSuggestions(true);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setForm((prev) => ({ ...prev, name: suggestion }));
    setShowSuggestions(false);
  };

  const validateEmail = (email: string) => /.+@.+\..+/.test(email);
  const validatePhone = (phone: string) => /^\d{9,15}$/.test(phone.replace(/[^\d]/g, ''));

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImagePreview(URL.createObjectURL(file));
      // TODO: Supabase Storage 업로드 후 image_url 저장
    }
  };

  // 제출 핸들러: Supabase에 저장
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!validateEmail(form.email)) {
      setError('이메일 형식이 올바르지 않습니다.');
      return;
    }
    if (!validatePhone(form.phone)) {
      setError('전화번호는 숫자만 9~15자리로 입력하세요.');
      return;
    }
    setLoading(true);
    const { error } = await supabase.from('supabase').insert([
      { ...form }
    ]);
    setLoading(false);
    if (error) {
      setError('저장 실패: ' + error.message);
      console.error(error);
    } else {
      setForm({ name: '', phone: '', email: '', zipcode: '', address: '', image_url: '' });
      setImagePreview(null);
      fetchCards(); // 저장 후 목록 갱신
    }
  };

  const handleCopy = (card: any) => {
    const text = `이름: ${card.name}\n전화번호: ${card.phone}\n이메일: ${card.email}\n우편번호: ${card.zipcode}\n주소: ${card.address}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(card.id);
      setTimeout(() => setCopiedId(null), 1200);
    });
  };

  const handleFavorite = async (card: any) => {
    await supabase.from('supabase').update({ favorite: !card.favorite }).eq('id', card.id);
    fetchCards();
  };

  // 카드 삭제 버튼 클릭 시 모달 오픈
  const handleDelete = (id: number) => {
    setModal({ open: true, type: 'delete', cardId: id });
  };

  // 모달에서 진짜 삭제 확인
  const confirmDelete = async () => {
    if (modal.cardId == null) return;
    setLoading(true);
    await supabase.from('supabase').delete().eq('id', modal.cardId);
    setLoading(false);
    fetchCards();
    setModal({ open: true, type: 'delete', message: '카드가 삭제되었어요! 🗑️' });
  };

  const handleEdit = (card: any) => {
    setEditId(card.id);
    setEditForm({ ...card });
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditForm((prev) => prev ? { ...prev, [name]: value } : null);
  };

  const handleEditSave = async () => {
    if (!editForm) return;
    await supabase.from('supabase').update(editForm).eq('id', editId);
    setEditId(null);
    setEditForm(null);
    fetchCards();
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditForm(null);
  };

  const highlight = (text: string, keyword: string) => {
    if (!keyword) return text;
    const regex = new RegExp(`(${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.split(regex).map((part, i) =>
      regex.test(part) ? <mark key={i} className="bg-yellow-200 text-yellow-900 px-0.5 rounded">{part}</mark> : part
    );
  };

  const filteredCards = cards.filter(card => {
    const q = search.trim().toLowerCase();
    if (showFavoriteOnly && !card.favorite) return false;
    if (!q) return true;
    return [card.name, card.phone, card.email, card.address, card.zipcode].some((v: string) => v && v.toLowerCase().includes(q));
  });

  // 페이지네이션 적용된 카드 목록
  const pagedCards = filteredCards.slice((currentPage - 1) * CARDS_PER_PAGE, currentPage * CARDS_PER_PAGE);
  const totalPages = Math.ceil(filteredCards.length / CARDS_PER_PAGE);

  // 페이지 변경 핸들러
  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // 검색/필터 변경 시 1페이지로 이동
  useEffect(() => {
    setCurrentPage(1);
  }, [search, showFavoriteOnly]);

  // CSV 내보내기 (한글 인코딩, 데이터 없으면 샘플)
  const handleExport = () => {
    const headers = ['name', 'phone', 'email', 'zipcode', 'address', 'image_url', 'favorite'];
    let csv = '';
    if (cards.length === 0) {
      // 데이터 없을 때 샘플(항목명만)
      csv = Papa.unparse([headers]);
    } else {
      // 데이터 있을 때
      const rows = cards.map(card => headers.map(h => card[h] ?? ''));
      csv = Papa.unparse({ fields: headers, data: rows });
    }
    // UTF-8 BOM 추가(한글 인코딩)
    const blob = new Blob(["\uFEFF" + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'business-cards.csv';
    a.click();
    URL.revokeObjectURL(url);
    // 성공 모달
    setModal({ open: true, type: 'export', message: 'CSV 파일이 성공적으로 내보내졌어요! 🎉' });
  };

  // CSV 가져오기 (한글 인코딩 지원, 유효성 검사)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    Papa.parse(file, {
      encoding: 'UTF-8',
      complete: async (results: any) => {
        try {
          const data = results.data;
          if (!Array.isArray(data) || data.length < 2) throw new Error('CSV 데이터가 올바르지 않습니다.');
          const [header, ...rows] = data;
          const expected = ['name', 'phone', 'email', 'zipcode', 'address', 'image_url', 'favorite'];
          if (header.join() !== expected.join()) throw new Error('CSV 헤더가 DB 구조와 다릅니다.');
          // 유효성 검사 및 변환
          const importData = rows.filter(r => r.length >= 5 && r.some((v: unknown) => v)).map(r => ({
            name: r[0] || '',
            phone: r[1] || '',
            email: r[2] || '',
            zipcode: r[3] || '',
            address: r[4] || '',
            image_url: r[5] || '',
            favorite: r[6] === 'true' || r[6] === true ? true : false,
          }));
          if (importData.length === 0) throw new Error('가져올 데이터가 없습니다.');
          setLoading(true);
          // 기존 데이터 삭제 후 삽입
          await supabase.from('supabase').delete().neq('id', 0);
          const { error } = await supabase.from('supabase').insert(importData);
          setLoading(false);
          if (error) throw error;
          fetchCards();
          setModal({ open: true, type: 'import', message: '데이터가 성공적으로 가져와졌어요! 🥳' });
        } catch (err: any) {
          setModal({ open: true, type: 'import', message: '가져오기 실패: ' + (err.message || err) });
        }
      },
      error: (err: any) => {
        setModal({ open: true, type: 'import', message: 'CSV 파싱 오류: ' + (err.message || err) });
      },
      skipEmptyLines: true,
    });
    // 파일 input 초기화
    e.target.value = '';
  };

  // 데이터 초기화(전체 삭제) - 모달 확인 시만 실행
  const handleReset = async () => {
    setModal({ open: true, type: 'reset' });
  };
  // 모달에서 진짜 삭제 확인
  const confirmReset = async () => {
    setLoading(true);
    await supabase.from('supabase').delete().neq('id', 0);
    setLoading(false);
    fetchCards();
    setModal({ open: true, type: 'reset', message: '모든 데이터가 삭제되었어요! 🧹' });
  };

  return (
    <main className="min-h-screen bg-gray-900 text-gray-100 flex flex-col items-center py-8 w-[90vw] mx-auto">
      {/* 상단 타이틀 & 다크/라이트 모드 토글 */}
      <header className="w-[90vw] flex items-center mb-8 px-4">
        <h1 className="text-2xl font-bold text-gray-100">Smart Name Card</h1>
      </header>

      {/* 입력폼 섹션 */}
      <section className="w-[90vw] bg-gray-800 rounded-lg shadow p-6 mb-8">
        <form className="grid grid-cols-1 md:grid-cols-2 gap-4" onSubmit={handleSubmit} autoComplete="off">
          <div className="relative">
            <label className="block mb-1 font-medium" htmlFor="name">이름</label>
            <input id="name" name="name" value={form.name} onChange={handleChange} required autoComplete="off" tabIndex={0} aria-label="이름" className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" onFocus={() => setShowSuggestions(true)} />
            {showSuggestions && form.name && nameSuggestions.length > 0 && (
              <ul className="absolute z-10 bg-gray-700 border border-gray-600 w-full mt-1 rounded shadow">
                {nameSuggestions.filter(n => n.toLowerCase().includes(form.name.toLowerCase()) && n !== form.name).map((s, i) => (
                  <li key={i} className="px-3 py-1 hover:bg-gray-800 cursor-pointer" onClick={() => handleSuggestionClick(s)}>{s}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block mb-1 font-medium" htmlFor="phone">전화번호</label>
            <input id="phone" name="phone" value={form.phone} onChange={handleChange} required autoComplete="off" tabIndex={0} aria-label="전화번호" className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
          </div>
          <div>
            <label className="block mb-1 font-medium" htmlFor="email">이메일</label>
            <input id="email" name="email" type="email" value={form.email} onChange={handleChange} required autoComplete="off" tabIndex={0} aria-label="이메일" className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
          </div>
          <div>
            <label className="block mb-1 font-medium" htmlFor="zipcode">우편번호</label>
            <input id="zipcode" name="zipcode" value={form.zipcode} onChange={handleChange} autoComplete="off" tabIndex={0} aria-label="우편번호" className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
          </div>
          <div className="md:col-span-2">
            <label className="block mb-1 font-medium" htmlFor="address">주소</label>
            <input id="address" name="address" value={form.address} onChange={handleChange} autoComplete="off" tabIndex={0} aria-label="주소" className="w-full px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" />
          </div>
          <div className="md:col-span-2 flex items-center gap-4">
            <label className="block font-medium whitespace-nowrap" htmlFor="profile-image">프로필/로고 이미지</label>
            <input id="profile-image" type="file" accept="image/*" ref={fileInputRef} onChange={handleImageChange} className="block" tabIndex={0} aria-label="프로필/로고 이미지 업로드" />
            {imagePreview && <img src={imagePreview} alt="미리보기" className="w-16 h-16 object-cover rounded-full border ml-2" />}
          </div>
          <div className="md:col-span-2 flex gap-2 mt-6 justify-center sm:justify-end w-full flex-nowrap overflow-x-auto">
            <button type="button" onClick={handleExport} className="min-w-[120px] px-4 py-2 rounded bg-green-600 text-white font-semibold hover:bg-green-700" aria-label="내보내기">데이터 내보내기</button>
            <label className="min-w-[120px] px-4 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 cursor-pointer" aria-label="가져오기">
              데이터 가져오기
              <input type="file" accept=".csv" onChange={handleImport} className="hidden" />
            </label>
            <button type="button" onClick={handleReset} className="min-w-[80px] px-4 py-2 rounded bg-red-600 text-white font-semibold hover:bg-red-700" aria-label="초기화">초기화</button>
            <button type="submit" className="min-w-[80px] px-6 py-2 rounded bg-blue-600 text-white font-semibold hover:bg-blue-700 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" disabled={loading} tabIndex={0} aria-label="저장">{loading ? '저장 중...' : '저장'}</button>
          </div>
        </form>
        {/* 에러 메시지 */}
        {error && <p className="text-red-500 mt-2">{error}</p>}
        {/* 커스텀 모달 */}
        {modal.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-2xl shadow-xl p-8 max-w-xs w-full flex flex-col items-center relative animate-fadein">
              <div className="text-4xl mb-2">{modal.type === 'reset' || modal.type === 'delete' ? '⚠️' : '🎀'}</div>
              <div className="text-lg font-bold text-gray-800 mb-2">
                {modal.type === 'reset' && !modal.message && '정말 모든 데이터를 삭제할까요?'}
                {modal.type === 'delete' && !modal.message && '정말 이 카드를 삭제할까요?'}
                {modal.message}
              </div>
              {modal.type === 'reset' && !modal.message && (
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setModal({ open: false, type: null }); }} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300">취소</button>
                  <button onClick={() => { setModal({ open: false, type: null }); confirmReset(); }} className="px-4 py-2 rounded-lg bg-pink-400 text-white font-semibold hover:bg-pink-500">삭제</button>
                </div>
              )}
              {modal.type === 'delete' && !modal.message && (
                <div className="flex gap-3 mt-4">
                  <button onClick={() => { setModal({ open: false, type: null }); }} className="px-4 py-2 rounded-lg bg-gray-200 text-gray-700 font-semibold hover:bg-gray-300">취소</button>
                  <button onClick={() => { setModal({ open: false, type: null }); confirmDelete(); }} className="px-4 py-2 rounded-lg bg-pink-400 text-white font-semibold hover:bg-pink-500">삭제</button>
                </div>
              )}
              {modal.message && (
                <button onClick={() => setModal({ open: false, type: null })} className="mt-4 px-4 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600">확인</button>
              )}
            </div>
          </div>
        )}
      </section>

      {/* 명함카드 그리드 */}
      <section className="w-[90vw]">
        <div className="mb-4 flex flex-col md:flex-row md:justify-between md:items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="명함 검색..."
            className="px-3 py-2 rounded border border-gray-600 bg-gray-900 text-gray-100 w-full md:w-1/2"
          />
          <div className="flex gap-2 ml-auto md:ml-2">
            {/* 검색어가 있을 때 전체보기 버튼 항상 노출 */}
            {search && (
              <button
                type="button"
                onClick={() => { setSearch(''); setShowFavoriteOnly(false); }}
                className="px-4 py-2 rounded font-semibold border transition bg-gray-200 text-gray-700 border-gray-300"
                aria-label="전체보기"
              >
                전체보기
              </button>
            )}
            {showFavoriteOnly ? (
              <button
                type="button"
                onClick={() => setShowFavoriteOnly(false)}
                className="px-4 py-2 rounded font-semibold border transition bg-gray-200 text-gray-700 border-gray-300"
                aria-label="전체보기"
              >
                전체보기
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setShowFavoriteOnly(true)}
                className="px-4 py-2 rounded font-semibold border transition bg-yellow-300 text-yellow-900 border-yellow-400"
                aria-label="즐겨찾기 보기"
              >
                ★ 즐겨찾기 보기
              </button>
            )}
          </div>
        </div>
        {fetching ? (
          <div className="text-center py-8 text-gray-400">불러오는 중...</div>
        ) : cards.length === 0 ? (
          <div className="text-center py-8 text-gray-400">등록된 명함이 없습니다.</div>
        ) : (
          <>
            {/* 카드 그리드: 모바일 1열, md 4열 */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {pagedCards.map(card => (
                <div key={card.id} className="bg-gray-800 rounded-xl shadow p-6 transition-transform duration-300 hover:scale-105 animate-fadein relative group flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="mb-2 text-lg font-semibold">{highlight(card.name, search)}</div>
                    </div>
                    <div className="relative flex flex-col items-center ml-2">
                      <button onClick={() => handleFavorite(card)} className="absolute -left-8 top-2 text-yellow-400 text-2xl z-10" title="즐겨찾기">
                        {card.favorite ? '★' : '☆'}
                      </button>
                      <div className="relative w-20 h-20">
                        <img src={card.image_url || AVATAR_PLACEHOLDER} alt="프로필" className="w-20 h-20 object-cover rounded-full border" />
                        <button
                          className="absolute bottom-1 right-1 w-7 h-7 bg-blue-500 rounded-full flex items-center justify-center border-2 border-white text-white text-lg shadow"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = 'image/*';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                const fileExt = file.name.split('.').pop();
                                const fileName = `${Date.now()}.${fileExt}`;
                                const { error } = await supabase.storage.from('profile-images').upload(fileName, file, { upsert: true });
                                if (!error) {
                                  const { data: urlData } = supabase.storage.from('profile-images').getPublicUrl(fileName);
                                  await supabase.from('supabase').update({ image_url: urlData?.publicUrl || '' }).eq('id', card.id);
                                  fetchCards();
                                }
                              }
                            };
                            input.click();
                          }}
                          type="button"
                          title="이미지 변경"
                        >
                          <span className="text-xl">＋</span>
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="mb-1 text-sm text-gray-300">📞 {highlight(card.phone, search)}</div>
                  <div className="mb-1 text-sm text-gray-300">✉️ {highlight(card.email, search)}</div>
                  <div className="mb-1 text-sm text-gray-300">🏷️ {highlight(card.zipcode, search)}</div>
                  <div className="mb-1 text-sm text-gray-300">🏠 {highlight(card.address, search)}</div>
                  <div className="mt-2 text-xs text-gray-400">등록일: {card.created_at ? new Date(card.created_at).toLocaleString() : ''}</div>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => handleCopy(card)} className="px-2 py-1 bg-gray-200 rounded text-xs text-black focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" tabIndex={0} aria-label="복사">{copiedId === card.id ? '복사됨' : '복사'}</button>
                    <button type="button" onClick={() => handleEdit(card)} className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" tabIndex={0} aria-label="수정">수정</button>
                    <button type="button" onClick={() => handleDelete(card.id)} className="px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" tabIndex={0} aria-label="삭제">삭제</button>
                  </div>
                  {editId === card.id && (
                    <div className="mt-4">
                      <input name="name" value={editForm?.name || ''} onChange={handleEditChange} className="w-full mb-2 px-2 py-1 rounded border bg-gray-600 bg-gray-900 text-gray-100" />
                      <input name="phone" value={editForm?.phone || ''} onChange={handleEditChange} className="w-full mb-2 px-2 py-1 rounded border bg-gray-600 bg-gray-900 text-gray-100" />
                      <input name="email" value={editForm?.email || ''} onChange={handleEditChange} className="w-full mb-2 px-2 py-1 rounded border bg-gray-600 bg-gray-900 text-gray-100" />
                      <input name="zipcode" value={editForm?.zipcode || ''} onChange={handleEditChange} className="w-full mb-2 px-2 py-1 rounded border bg-gray-600 bg-gray-900 text-gray-100" />
                      <input name="address" value={editForm?.address || ''} onChange={handleEditChange} className="w-full mb-2 px-2 py-1 rounded border bg-gray-600 bg-gray-900 text-gray-100" />
                      <div className="flex gap-2 mt-2">
                        <button type="button" onClick={handleEditSave} className="px-3 py-1 bg-blue-500 text-white rounded">저장</button>
                        <button type="button" onClick={handleEditCancel} className="px-3 py-1 bg-gray-400 text-white rounded">취소</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {/* 페이지네이션 UI: 처음, 이전, 현재/전체, 다음, 마지막 */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  type="button"
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  aria-label="처음 페이지"
                >
                  처음
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  aria-label="이전 페이지"
                >
                  이전
                </button>
                <span className="mx-2 text-sm">{currentPage} / {totalPages}</span>
                <button
                  type="button"
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  aria-label="다음 페이지"
                >
                  다음
                </button>
                <button
                  type="button"
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 rounded bg-gray-200 text-gray-700 disabled:opacity-50"
                  aria-label="마지막 페이지"
                >
                  마지막
                </button>
              </div>
            )}
          </>
        )}
      </section>
      <style jsx global>{`
        @keyframes fadein {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-fadein {
          animation: fadein 0.8s;
          opacity: 1 !important;
        }
      `}</style>
    </main>
  );
}
