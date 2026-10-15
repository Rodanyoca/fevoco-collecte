const paths={
 edit:'<path d="m16 3 5 5M3 21l5-1L21 7a2 2 0 0 0-5-5L3 15z"/>',
 trash:'<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
 home:'<path d="m3 10 9-7 9 7v10a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
 users:'<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/><circle cx="9" cy="7" r="4"/>',
 search:'<circle cx="10.5" cy="10.5" r="7.5"/><path d="m16 16 5 5"/>',
 settings:'<path d="m9 3 .6-1h4.8l.6 1 .3 2 1.7 1 2-.8 2.4 4.1-1.6 1.3v2l1.6 1.3-2.4 4.2-2-.8-1.7 1-.3 2-.6 1H9l-.6-1-.3-2-1.7-1-2 .8L2 14l1.6-1.3v-2L2 9.4l2.4-4.2 2 .8 1.7-1z"/><circle cx="12" cy="11.7" r="3.2"/>',
 plus:'<path d="M12 5v14M5 12h14"/>',
 arrow:'<path d="M5 12h14m-6-6 6 6-6 6"/>',
 download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
 shield:'<path d="M12 2 3 6v6c0 5 9 10 9 10s9-5 9-10V6z"/><path d="m8 12 3 3 5-6"/>',
 club:'<path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6M9 8h1m4 0h1M9 11h1m4 0h1"/>'
};
export function icon(name){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+(paths[name]||paths.users)+'</svg>';}
