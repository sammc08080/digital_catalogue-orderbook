'use client';

import { useState } from 'react';

// Find a product by art number / product number
export default function SearchBar({ onSearch }) {
  const [text, setText] = useState('');

  function submit(e) {
    e.preventDefault();
    onSearch(text.trim());
    if (document.activeElement) document.activeElement.blur();
  }

  function change(e) {
    setText(e.target.value);
    if (!e.target.value.trim()) onSearch('');
  }

  return (
    <form className="search-bar" onSubmit={submit}>
      <input type="search" inputMode="search" placeholder="Art number / product number" value={text} onChange={change} />
      <button className="btn">Search</button>
    </form>
  );
}

export function matchArt(p, q) {
  if (!q) return true;
  return String(p.art_no || '').toLowerCase().includes(q.toLowerCase());
}
