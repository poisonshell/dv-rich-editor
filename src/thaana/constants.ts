// Extracted static Thaana IME constants & layouts
export const AKURU = new Set<string>([
  'd','k','s','t','f','g','h','j','l','z','v','b','n','m','r','y','p','c',
  'D','K','S','T','F','G','H','J','L','Z','V','B','N','M','R','Y','P','C'
]);

export const FILI = new Set<string>(['a','i','u','e','o','q','A','I','U','E','O']);

export const IMMEDIATE_CHARS = new Set<string>([
  '.',',','!','?','\n','\t',';' ,':','(',')','[',']','{','}','<','>','/','\\'
]);

export const STANDARD_CHAR_MAP: Record<string,string> = Object.freeze({
  q:'ް',w:'އ',e:'ެ',r:'ރ',t:'ތ',y:'ޔ',u:'ު',i:'ި',o:'ޮ',p:'ޕ',a:'ަ',s:'ސ',d:'ދ',f:'ފ',g:'ގ',h:'ހ',j:'ޖ',k:'ކ',l:'ލ',z:'ޒ',x:'×',c:'ޗ',v:'ވ',b:'ބ',n:'ނ',m:'މ',
  Q:'ޤ',W:'ޢ',E:'ޭ',R:'ޜ',T:'ޓ',Y:'ޠ',U:'ޫ',I:'ީ',O:'ޯ',P:'÷',A:'ާ',S:'ށ',D:'ޑ',F:'ﷲ',G:'ޣ',H:'ޙ',J:'ޛ',K:'ޚ',L:'ޅ',Z:'ޡ',X:'ޘ',C:'ޝ',V:'ޥ',B:'ޞ',N:'ޏ',M:'ޟ',
  ',':'،',';':'؛','?':'؟','<':'>','>':'<','[':']',']':'[','(' :')',')':'(','{':'}','}':'{'
});

export const LAYOUTS: Record<string, Record<string,string>> = {
  standard: STANDARD_CHAR_MAP,
};

export type LayoutName = keyof typeof LAYOUTS;
