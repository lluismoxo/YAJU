// Editorial overrides reviewed against the original UI. Keep brand names intact.
import {readFile,writeFile} from 'node:fs/promises';
const overrides={
 de:{'Sending…':'Wird gesendet…','Accept Cookies':'Cookies akzeptieren','Reject / Decline':'Ablehnen','Manage Cookies':'Cookies verwalten','Cookie preferences':'Cookie-Einstellungen','Save preferences':'Einstellungen speichern','Strictly necessary':'Unbedingt erforderlich','Always active':'Immer aktiv','Analytics':'Analyse','Privacy Policy':'Datenschutzerklärung','Cookie Policy':'Cookie-Richtlinie','Book demo':'Demo buchen','Read more':'Mehr erfahren','Learn more':'Mehr erfahren','First name':'Vorname','Last name':'Nachname'},
 fr:{'Sending…':'Envoi en cours…','Accept Cookies':'Accepter les cookies','Reject / Decline':'Refuser','Manage Cookies':'Gérer les cookies','Cookie preferences':'Préférences de cookies','Save preferences':'Enregistrer mes choix','Strictly necessary':'Strictement nécessaires','Always active':'Toujours actifs','Analytics':'Analyse','Privacy Policy':'Politique de confidentialité','Cookie Policy':'Politique relative aux cookies','Book demo':'Réserver une démo','Read more':'En savoir plus','Learn more':'En savoir plus','First name':'Prénom','Last name':'Nom'},
 es:{'Sending…':'Enviando…','Accept Cookies':'Aceptar cookies','Reject / Decline':'Rechazar','Manage Cookies':'Gestionar cookies','Cookie preferences':'Preferencias de cookies','Save preferences':'Guardar preferencias','Strictly necessary':'Estrictamente necesarias','Always active':'Siempre activas','Analytics':'Analítica','Privacy Policy':'Política de privacidad','Cookie Policy':'Política de cookies','Book demo':'Reservar demo','Read more':'Leer más','Learn more':'Más información','First name':'Nombre','Last name':'Apellidos'},
 ja:{'Sending…':'送信中…','Accept Cookies':'Cookieを許可','Reject / Decline':'拒否','Manage Cookies':'Cookieを管理','Cookie preferences':'Cookie設定','Save preferences':'設定を保存','Strictly necessary':'必須Cookie','Always active':'常に有効','Analytics':'アクセス解析','Privacy Policy':'プライバシーポリシー','Cookie Policy':'Cookieポリシー','Book demo':'デモを予約','Read more':'続きを読む','Learn more':'詳細を見る','First name':'名','Last name':'姓'},
 ko:{'Sending…':'전송 중…','Accept Cookies':'쿠키 허용','Reject / Decline':'거부','Manage Cookies':'쿠키 관리','Cookie preferences':'쿠키 설정','Save preferences':'설정 저장','Strictly necessary':'필수 쿠키','Always active':'항상 활성화','Analytics':'분석','Privacy Policy':'개인정보 처리방침','Cookie Policy':'쿠키 정책','Book demo':'데모 예약','Read more':'더 읽기','Learn more':'자세히 보기','First name':'이름','Last name':'성'}
};
const source=JSON.parse(await readFile('locales/en-US.json','utf8'));
for(const [locale,values]of Object.entries(overrides)){
 const dict=JSON.parse(await readFile(`locales/${locale}.json`,'utf8'));
 for(const [key,value]of Object.entries(values))if(key in source)dict[key]=value;
 for(const [key,value]of Object.entries(dict)){
  dict[key]=value.replace(/__(?:ヤジュ|やじゅう|야주)__/g,'Yaju').replace(/YajuBlog/g,'Yaju Blog');
  if(/__\s*YAJU\s*__/i.test(value))dict[key]=value.replace(/__\s*YAJU\s*__/gi,'Yaju');
  if(/\[\d{5}\]|__YAJU__/.test(dict[key]))throw Error(`Translation marker remains: ${locale}: ${key}`);
 }
 await writeFile(`locales/${locale}.json`,JSON.stringify(dict,null,2)+'\n');
}
