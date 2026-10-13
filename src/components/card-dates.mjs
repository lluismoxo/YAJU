import timestamps from '../content/card-dates.json' with {type:'json'};
// Snapshots may have been captured with a different browser locale. Keep the
// original publication timestamp as data for the native locale formatter.
const months = new Map([
 ['jan',1],['ene',1],['feb',2],['mar',3],['apr',4],['abr',4],['may',5],
 ['jun',6],['jul',7],['aug',8],['ago',8],['sep',9],['sept',9],
 ['oct',10],['nov',11],['dec',12],['dic',12],
]);
function annotateDates(html,href) {
 return html.replace(/<p\b([^>]*)>([^<>]* - )([a-z]+) (\d{2}), (\d{4})<\/p>/gi,(original,attributes,author,month,day,year)=>{
  const number=months.get(month.toLowerCase());
  if(!number||!attributes.includes('font-eyebrow')||attributes.includes('data-native-card-date'))return original;
  const calendar=`${year}-${String(number).padStart(2,'0')}-${day}`;
  const date=timestamps[`${href}|${calendar}`]||calendar;
  return `<p${attributes} data-native-card-date="${date}">${author}${month} ${day}, ${year}</p>`;
 });
}
export function annotateCardDates(html) {
 const cards=html.replace(/<a\b[^>]*>.*?<\/a>/gs,card=>annotateDates(card,card.match(/href="([^"]+)"/)?.[1]));
 return annotateDates(cards);
}
export function annotateInteractionDates(value) {
 if(Array.isArray(value))return value.map(annotateInteractionDates);
 if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,key==='html'&&typeof item==='string'?annotateCardDates(item):annotateInteractionDates(item)]));
 return value;
}
