const escape = value => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');

function policyLink({label, href}) {
  if (!/^\/[a-z0-9/-]+$/.test(href)) throw new Error(`Invalid policy link: ${href}`);
  return `<div class="flex items-start gap-3"><div class="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full md:h-2.5 md:w-2.5 lg:h-3 lg:w-3 bg-neutral-50"></div><a rel="" target="_self" class="underline hover:text-opacity-80" href="${href}"><p class="text-web3-16 lg:text-web3-18 font-body">${escape(label)}</p></a></div>`;
}
function policyGroup(group,index) {
  const top = index === 0 ? 'pt-16 md:pt-24 ' : '';
  return `<section class="relative w-full px-4 lg:px-10 ${top}pb-12 md:pb-20 text-black"><div class="relative z-content"><div class="rounded-xl border p-6 md:p-10 border-neutral-50"><div class="flex flex-col md:flex-row md:[&amp;&gt;div]:w-1/2"><div class="mb-10 motion-safe:animate-[fadeInUp_0.5s_forwards_ease-in-out] motion-safe:opacity-0 md:mb-0"><h2 class="text-web3-24-heading lg:text-web3-32 font-body mb-4 break-words md:max-w-3/4 lg:max-w-[522px]">${escape(group.title)}</h2></div><div class="flex flex-col gap-6 motion-safe:animate-[fadeInUp_0.5s_forwards_ease-in-out] motion-safe:opacity-0 md:flex-row md:w-1/2">${group.columns.map(column => `<div class="inline-flex flex-col items-start justify-start gap-4 lg:max-w-[408px]"><div class="flex flex-col gap-3">${column.map(policyLink).join('')}</div></div>`).join('')}</div></div></div></div></section>`;
}
export function renderLegal(content) {
  return `<main id="main-content" role="main" tabindex="-1"><section class="relative w-full px-4 lg:px-10 pt-28 md:pt-40 pb-16 md:pb-36 text-black" style="background: rgb(240, 238, 233);"><div class="relative z-content mx-auto w-full max-w-web3-internal-wrapper"><div class="text-center"><div class="motion-safe:opacity-0 motion-safe:animate-[fadeInUp_0.5s_forwards_ease-in-out]"><div class="break-words 2xl:max-w-[1880px] md:max-w-[1128px] mb-0 mx-auto [&amp;_p_a]:!inline portable-text-breaks"><h1 class="text-web3-40 lg:text-web3-72 font-body-web2 2xl:text-balance">${escape(content.title)}</h1></div></div><div><div class="mx-auto flex motion-safe:opacity-0 motion-safe:animate-[fadeInUp_0.5s_forwards_0.1s_ease-in-out]"></div></div></div></div></section>${content.groups.map(policyGroup).join('')}</main>`;
}
