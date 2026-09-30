(() => {
  const path = window.location.pathname.replace(/\/$/, "") || "/";

  const text = (element) => element?.textContent?.replace(/\s+/g, " ").trim() || "";

  const removeMainLinks = (labels) => {
    document.querySelectorAll("main a").forEach((link) => {
      if (labels.includes(text(link))) link.remove();
    });
  };

  const replaceImage = (oldHash, newPath) => {
    document.querySelectorAll("img, source").forEach((element) => {
      ["src", "srcset"].forEach((attribute) => {
        const value = element.getAttribute(attribute);
        if (value?.includes(oldHash)) element.setAttribute(attribute, newPath);
      });
    });
  };

  const blogCovers = [
    ["/assets/blog-covers/yaju-blog-cover-01.webp", "/assets/blog-covers/yaju-logo-blanco.png"],
    ["/assets/blog-covers/yaju-blog-cover-02.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-03.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-04.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-05.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-06.webp", "/assets/blog-covers/yaju-logo-blanco.png"],
    ["/assets/blog-covers/yaju-blog-cover-07.webp", "/assets/blog-covers/yaju-logo-blanco.png"],
    ["/assets/blog-covers/yaju-blog-cover-08.webp", "/assets/blog-covers/yaju-logo-turquesa.png"],
    ["/assets/blog-covers/yaju-blog-cover-09.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-10.webp", "/assets/blog-covers/yaju-logo-fucsia.png"],
    ["/assets/blog-covers/yaju-blog-cover-11.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-12.webp", "/assets/blog-covers/yaju-logo-blanco.png"],
    ["/assets/blog-covers/yaju-blog-cover-13.webp", "/assets/blog-covers/yaju-logo-rosa-claro.png"],
    ["/assets/blog-covers/yaju-blog-cover-14.webp", "/assets/blog-covers/yaju-logo-negro.png"],
    ["/assets/blog-covers/yaju-blog-cover-15.webp", "/assets/blog-covers/yaju-logo-blanco.png"],
  ];

  const stableCoverIndex = (value) => {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0) % blogCovers.length;
  };

  const setWallpaperCover = (image, coverPath) => {
    if (!image) return;
    if (image.getAttribute("src") !== coverPath) image.setAttribute("src", coverPath);
    if (image.getAttribute("srcset") !== coverPath) image.setAttribute("srcset", coverPath);
    image.style.objectFit = "cover";
    image.style.objectPosition = "center";
    image.dataset.yajuWallpaperCover = "true";
    image.closest("picture")?.querySelectorAll("source").forEach((source) => {
      if (source.getAttribute("srcset") !== coverPath) source.setAttribute("srcset", coverPath);
    });
  };

  const patchWallpaperCards = () => {
    const targetedCards = {
      "/labs": ["/agent-hub", "/labs/scholars", "/labs/open-development", "/labs/catalyst-grants"],
      "/labs/futures-of-work": ["/labormap", "/labs"],
    };

    document.querySelectorAll("main a[href]").forEach((link) => {
      let url;
      try {
        url = new URL(link.getAttribute("href"), window.location.origin);
      } catch {
        return;
      }
      const segments = url.pathname.split("/").filter(Boolean);
      const isYajuHost = url.origin === window.location.origin || ["yajuas.com", "www.yajuas.com"].includes(url.hostname);
      const isCustomerStory = isYajuHost && segments.length === 2 && segments[0] === "customer-stories";
      const isTargetedCard = targetedCards[path]?.includes(url.pathname);
      if (!isCustomerStory && !isTargetedCard) return;

      const image = [...link.querySelectorAll("img")].find((candidate) =>
        !candidate.hasAttribute("data-yaju-blog-logo") &&
        !candidate.hasAttribute("data-yaju-nav-logo") &&
        !candidate.getAttribute("src")?.includes("yaju-logo-")
      );
      if (!image) return;
      const coverKey = isCustomerStory ? `${url.pathname}|wallpaper` : `${url.pathname}:${text(link)}`;
      const coverPath = blogCovers[stableCoverIndex(coverKey)][0];
      setWallpaperCover(image, coverPath);
      link.dataset.yajuWallpaperCard = "true";
    });

    if (path === "/customer-stories") {
      document.querySelectorAll("main a[href]").forEach((link) => {
        const backgrounds = [...link.querySelectorAll("img[alt='Feature Box Background Image']")];
        if (!backgrounds.length) return;
        const coverPath = blogCovers[stableCoverIndex(link.getAttribute("href") || text(link))][0];
        backgrounds.forEach((image) => setWallpaperCover(image, coverPath));
        link.dataset.yajuWallpaperCard = "true";
      });
    }
  };

  const patchBlogCards = () => {
    document.querySelectorAll("main a[href]").forEach((link) => {
      let url;
      try {
        url = new URL(link.getAttribute("href"), window.location.origin);
      } catch {
        return;
      }
      const segments = url.pathname.split("/").filter(Boolean);
      const isYajuHost = url.origin === window.location.origin || ["yajuas.com", "www.yajuas.com"].includes(url.hostname);
      if (!isYajuHost || segments.length !== 2 || segments[0] !== "blog") return;

      const cover = [...link.querySelectorAll("img")]
        .find((image) => !image.hasAttribute("data-yaju-blog-logo"));
      if (!cover) return;

      const [coverPath, logoPath] = blogCovers[stableCoverIndex(url.pathname)];
      if (cover.getAttribute("src") !== coverPath) cover.setAttribute("src", coverPath);
      if (cover.getAttribute("srcset") !== coverPath) cover.setAttribute("srcset", coverPath);
      cover.style.objectFit = "cover";
      cover.style.objectPosition = "center";
      cover.dataset.yajuBlogCover = "true";

      const picture = cover.closest("picture");
      picture?.querySelectorAll("source").forEach((source) => {
        if (source.getAttribute("srcset") !== coverPath) source.setAttribute("srcset", coverPath);
      });
      const media = picture?.parentElement || cover.parentElement;
      if (!media) return;
      media.dataset.yajuBlogMedia = "true";
      if (window.getComputedStyle(media).position === "static") media.style.position = "relative";
      media.style.overflow = "hidden";

      let logo = media.querySelector(":scope > [data-yaju-blog-logo]");
      if (!logo) {
        logo = document.createElement("img");
        logo.dataset.yajuBlogLogo = "true";
        logo.alt = "";
        logo.setAttribute("aria-hidden", "true");
        logo.loading = "lazy";
        media.append(logo);
      }
      if (logo.getAttribute("src") !== logoPath) logo.setAttribute("src", logoPath);
      logo.removeAttribute("srcset");
      logo.style.cssText = "position:absolute;left:50%;top:50%;width:min(38%,320px);height:auto;transform:translate(-50%,-50%);z-index:3;pointer-events:none;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.08));";
      link.dataset.yajuBlogCard = "true";
    });
  };

  const roundImage = (image, radius = "12px") => {
    if (!image) return;
    image.style.borderRadius = radius;
    image.style.overflow = "hidden";
    image.style.display = "block";
    const frame = image.parentElement;
    if (frame) {
      frame.style.borderRadius = radius;
      frame.style.overflow = "hidden";
    }
  };

  const renderAgentAcademy = () => {
    const main = document.querySelector("main#main-content, main");
    if (!main) return;

    if (!document.getElementById("yaju-agent-academy-styles")) {
      const style = document.createElement("style");
      style.id = "yaju-agent-academy-styles";
      style.textContent = `
        body:has(main#main-content) main#main-content:not([data-yaju-academy-template]) { opacity:0; }
        main[data-yaju-academy-template='globalmmlu'] { opacity:1; transition:opacity .2s ease; }
        .academy-hero-copy p { display:block; font-size:14px; line-height:1.55; margin:0 0 12px; }
        .academy-hero-copy p:last-child { margin-bottom:0; }
        .academy-global-copy p { font-size:14px; line-height:1.72; margin:0 0 16px; }
        .academy-global-copy p:last-child { margin-bottom:0; }
        .academy-global-art { align-self:flex-start; }
        .academy-global-art img { aspect-ratio:1/1; object-fit:cover; }
        body:has(main[data-yaju-academy-template='globalmmlu']) nav.hidden.lg\\:block { color:#000 !important; }
        body:has(main[data-yaju-academy-template='globalmmlu']) nav.hidden.lg\\:block > div.bg-neutral-15 { background-color:#fff !important; }
        body:has(main[data-yaju-academy-template='globalmmlu']) nav.lg\\:hidden { color:#000 !important; background-color:#fff !important; }
        @media (min-width:1024px) {
          .academy-global-copy p { font-size:15px; line-height:1.75; }
          .academy-global-art { position:sticky; top:112px; }
        }
      `;
      document.head.append(style);
    }

    if (main.dataset.yajuAcademyTemplate === "globalmmlu" || document.readyState !== "complete") return;

    const originalHero = main.querySelector("section");
    const originalIntro = [...(originalHero?.querySelectorAll("p") || [])]
      .map((paragraph) => text(paragraph).replace(/([.!?])(?=[A-Z])/g, "$1 "))
      .filter((value) => value && value !== "AGENT ACADEMY");
    const modules = [...main.querySelectorAll("[id^='module-']")].map((module, index) => ({
      id: module.id || `module-${index + 1}`,
      number: index + 1,
      title: text(module.querySelector("h1, h2, h3, h4, h5")),
      paragraphs: [...module.querySelectorAll("p")]
        .map((paragraph) => text(paragraph))
        .filter((value) => value && !/^MODULE\s+\d+\.?$/i.test(value)),
    }));
    if (modules.length !== 8) return;

    const schema = main.querySelector("script[type='application/ld+json']")?.cloneNode(true);
    main.innerHTML = `
      <section class="relative w-full px-4 lg:px-10 pt-28 md:pt-40 pb-12 md:pb-20 text-black">
        <div class="relative z-content max-w-web3-full-screen mx-auto w-full max-w-web3-internal-wrapper h-full">
          <div class="flex h-full md:gap-x-10 justify-center lg:gap-x-32 flex-col md:flex-row" style="align-items:center">
            <div class="w-full mb-10 md:mb-14 md:w-1/2 [&>div]:lg:max-w-[550px] [&>div]:md:mr-auto">
              <div class="text-left max-w-[350px] sm:max-w-full">
                <p class="text-web3-14-eyebrow uppercase font-eyebrow mb-3">Agent Academy</p>
                <div class="mb-4 break-words"><h1 class="text-web3-32-heading lg:text-web3-60 font-body-web2">Learn to build and operate AI agents</h1></div>
                <div class="break-words mb-6 lg:mb-10 lg:w-[555px] academy-hero-copy"></div>
                <div class="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
                  <div class="group relative z-10 inline-block"><a class="relative flex w-fit items-center justify-center bg-neutral-15 text-pureWhite web3-primary-solid-btn rounded-full px-6 py-3 border-2 border-transparent gap-2 outline-none" href="#module-1"><span class="text-web3-16 lg:text-web3-18 font-body">Start learning</span><span class="flex shrink-0 items-center"><i class="icon-default icon-arrow-down text-icon-md"></i></span></a></div>
                  <a class="group inline-flex max-w-full outline-none" href="#academy-modules"><span class="flex items-center gap-2 text-volcanic-900"><span class="text-web3-16 lg:text-web3-18 font-body">View all modules</span><i class="icon-default icon-arrow-down"></i></span></a>
                </div>
              </div>
            </div>
            <div class="w-full md:w-1/2"><img width="1080" height="1080" alt="Agent Academy" class="m-auto w-full rounded-lg md:rounded-xl" src="https://cdn.sanity.io/images/rjtqmwfu/web3-prod/84bcfb26b51939c759243f7437b6cdfe57dffb2e-1080x1080.svg"></div>
          </div>
        </div>
      </section>
      <section class="relative w-full px-4 lg:px-10 pb-12 md:pb-20 text-black" id="academy-modules">
        <div class="relative z-content mx-auto w-full max-w-web3-internal-wrapper">
          <div class="flex flex-col justify-start md:flex-row md:justify-center w-full gap-y-9 md:gap-x-5">
            <div class="flex w-full flex-col items-start text-start"><img width="100" height="100" alt="" class="block pb-6 max-w-[100px]" src="https://cdn.sanity.io/images/rjtqmwfu/web3-prod/c433addf3490554cad43f7fff4566747ac6dc88e-100x100.svg"><div class="flex flex-col gap-4 md:pe-6"><p class="text-web3-20 lg:text-web3-24 font-body">Understand the loop</p><p class="text-web3-14 lg:text-web3-16 font-body">Learn where agents differ from chatbots, scripts and traditional automation.</p></div></div>
            <div class="flex w-full flex-col items-start text-start"><img width="100" height="100" alt="" class="block pb-6 max-w-[100px]" src="https://cdn.sanity.io/images/rjtqmwfu/web3-prod/094dcf0886c902b7e3a00bec70ea17e9e6d0b089-100x100.svg"><div class="flex flex-col gap-4 md:pe-6"><p class="text-web3-20 lg:text-web3-24 font-body">Build deliberately</p><p class="text-web3-14 lg:text-web3-16 font-body">Design tools, context, permissions and evaluations before production.</p></div></div>
            <div class="flex w-full flex-col items-start text-start"><img width="100" height="100" alt="" class="block pb-6 max-w-[100px]" src="https://cdn.sanity.io/images/rjtqmwfu/web3-prod/9e0070f08d59734929fbab1391b7b6a4a523155c-100x100.svg"><div class="flex flex-col gap-4 md:pe-6"><p class="text-web3-20 lg:text-web3-24 font-body">Operate at scale</p><p class="text-web3-14 lg:text-web3-16 font-body">Deploy, govern, observe and optimise a fleet through Yaju.</p></div></div>
          </div>
        </div>
      </section>
      <div data-academy-module-sections></div>
      <section class="relative w-full px-4 lg:px-10 pt-12 md:pt-20 pb-12 md:pb-20 text-black">
        <div class="relative z-content mx-auto w-full max-w-web3-internal-wrapper">
          <div class="flex flex-col md:flex-row md:justify-between md:gap-x-12 lg:gap-x-32">
            <div class="mb-12 md:mb-0 md:w-3/4 lg:w-1/2 lg:max-w-[555px]"><p class="text-web3-16 lg:text-web3-18 font-body">Work through the course in order. Each module builds on the last, from the first agent loop to identity, policy, tracing, cost control and fleet operations.</p></div>
            <div class="grid grid-cols-2 gap-10 overflow-hidden lg:w-1/2">
              <div class="flex min-w-[150px] flex-col md:min-w-[300px]"><span class="text-web3-48 sm:text-web3-60 xl:text-web3-96 font-body-web2 inline-flex items-baseline whitespace-nowrap leading-none">8</span><p class="text-web3-16 lg:text-web3-18 font-body pt-1 text-black">Progressive modules</p></div>
              <div class="flex min-w-[150px] flex-col md:min-w-[300px]"><span class="text-web3-48 sm:text-web3-60 xl:text-web3-96 font-body-web2 inline-flex items-baseline whitespace-nowrap leading-none">0</span><p class="text-web3-16 lg:text-web3-18 font-body pt-1 text-black">Prior experience required</p></div>
            </div>
          </div>
        </div>
      </section>`;

    if (schema) main.prepend(schema);
    const heroCopy = main.querySelector(".academy-hero-copy");
    (originalIntro.length ? originalIntro : ["A practical course on building and operating AI agents, from first principles to a production fleet."]).forEach((copy) => {
      const paragraph = document.createElement("p");
      paragraph.className = "text-web3-14 lg:text-web3-16 font-body mb-4";
      paragraph.textContent = copy;
      heroCopy?.append(paragraph);
    });

    const art = [
      "/assets/img/0000000000001ca14b6f625152866e012987d05c-680x680.webp",
      "https://cdn.sanity.io/images/rjtqmwfu/web3-prod/2aa87956099b42ee526b90c224113e453b495702-680x680.svg",
      "https://cdn.sanity.io/images/rjtqmwfu/web3-prod/84bcfb26b51939c759243f7437b6cdfe57dffb2e-1080x1080.svg",
    ];
    const moduleHost = main.querySelector("[data-academy-module-sections]");
    modules.forEach((module, index) => {
      const dark = index % 2 === 1;
      const reverse = index % 2 === 0;
      const section = document.createElement("section");
      section.id = module.id;
      section.className = `relative w-full px-4 lg:px-10 pt-12 md:pt-20 pb-12 md:pb-20 ${dark ? "text-pureWhite" : "text-black"}`;
      if (dark) section.style.background = "rgb(41, 66, 150)";
      section.innerHTML = `
        <div class="relative z-content max-w-web3-full-screen mx-auto w-full max-w-web3-internal-wrapper h-full">
          <div class="flex h-full md:gap-x-10 justify-center lg:gap-x-32 flex-col ${reverse ? "md:flex-row-reverse" : "md:flex-row"}" style="align-items:flex-start">
            <div class="w-full mb-10 md:mb-14 md:w-1/2">
              <div class="text-left max-w-[620px] sm:max-w-full">
                <p class="text-web3-14-eyebrow uppercase font-eyebrow mb-3">Module ${module.number}</p>
                <div class="mb-6 break-words"><h2 class="text-web3-28 lg:text-web3-48-alt font-body" data-academy-title></h2></div>
                <div class="academy-global-copy" data-academy-copy></div>
              </div>
            </div>
            <div class="w-full md:w-1/2 academy-global-art"><img width="680" height="680" alt="" class="m-auto w-full rounded-lg md:rounded-xl" src="${art[index % art.length]}"></div>
          </div>
        </div>`;
      section.querySelector("[data-academy-title]").textContent = module.title;
      const copy = section.querySelector("[data-academy-copy]");
      module.paragraphs.forEach((value) => {
        const paragraph = document.createElement("p");
        paragraph.textContent = value;
        copy.append(paragraph);
      });
      moduleHost?.append(section);
    });

    main.dataset.yajuAcademyTemplate = "globalmmlu";

    const footerHeading = [...document.querySelectorAll("footer h1, footer h2, footer h3")]
      .find((heading) => text(heading) === "Ready to run your agents like production software?");
    const footerSection = footerHeading?.closest("section");
    if (footerSection) {
      footerSection.className = "relative px-4 lg:px-10 pt-12 md:pt-20 pb-12 md:pb-20 text-pureWhite flex w-full flex-col overflow-hidden md:mb-0 md:min-h-[400px] md:justify-center lg:min-h-[500px] xl:min-h-[600px] z-0";
      footerSection.style.background = "rgb(46, 46, 46)";
      footerSection.innerHTML = `
        <div class="absolute top-0 left-0 h-full w-full"><img alt="" class="h-full w-full object-cover object-center z-background" src="https://cdn.sanity.io/images/rjtqmwfu/web3-prod/da0e62189598c301160ac609fd5c893696e1dbc2-2880x1200.png"></div>
        <div class="relative z-content mx-auto w-full max-w-web3-full-screen"><div class="flex h-full w-full flex-col justify-center items-center [&>*]:text-center"><div class="text-center md:max-w-[892px]"><h2 class="text-web3-32-heading lg:text-web3-60 font-body-web2">Start Agent Academy</h2></div><div class="flex flex-col items-center justify-center gap-4 sm:flex-row mt-8"><div class="group relative z-10 inline-block"><a class="relative flex w-fit items-center justify-center bg-pureWhite text-neutral-15 web3-primary-solid-btn rounded-full px-6 py-3 border-2 border-transparent gap-2 outline-none" href="#module-1"><span class="text-web3-16 lg:text-web3-18 font-body">Begin with module 1</span><i class="icon-default icon-arrow-up-right text-icon-md"></i></a></div><a class="text-web3-16 lg:text-web3-18 font-body border-b border-white pb-1" href="/labs">About Yaju Labs</a></div></div></div>`;
    }
  };

  const patchNavigation = () => {
    document.querySelectorAll("nav a[href='/blog/the-future-of-work-debate-has-an-evidence-problem']").forEach((link) => {
      link.setAttribute("href", "/labs/agentic-task-ecosystem");
      const walker = document.createTreeWalker(link, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) {
        if (walker.currentNode.nodeValue.trim()) nodes.push(walker.currentNode);
      }
      nodes.forEach((node, index) => {
        if (!node.nodeValue.includes("\ue904")) node.nodeValue = index === 0 ? "Ecosystem" : "";
      });
    });

    document.querySelectorAll("nav p").forEach((heading) => {
      if (text(heading) !== "Explorations") return;
      const group = heading.parentElement;
      const list = group?.querySelector("ul");
      if (!list || list.querySelector("a[href='/labs/agentic-task-ecosystem']")) return;
      const oranItem = [...list.querySelectorAll("li")].find((item) => item.querySelector("a[href='/labs/oran']"));
      if (!oranItem) return;
      const item = oranItem.cloneNode(true);
      const link = item.querySelector("a");
      const paragraphs = item.querySelectorAll("p");
      link?.setAttribute("href", "/labs/agentic-task-ecosystem");
      if (paragraphs[0]) paragraphs[0].textContent = "Agentic Task Ecosystem";
      if (paragraphs[1]) paragraphs[1].textContent = "Explore how AI tools are changing work";
      list.append(item);
    });

    const featuredPromos = [
      {
        href: "/ai-observability",
        label: "Observe every agent with Yaju",
        cover: "/assets/blog-covers/yaju-blog-cover-01.webp",
        logo: "/assets/blog-covers/yaju-logo-blanco.png",
      },
      {
        href: "/credential-vault",
        label: "Secure credentials with Yaju",
        cover: "/assets/blog-covers/yaju-blog-cover-04.webp",
        logo: "/assets/blog-covers/yaju-logo-negro.png",
      },
      {
        href: "/customer-stories/support-triage-with-agents",
        label: "Support triage, powered by Yaju",
        cover: "/assets/blog-covers/yaju-blog-cover-07.webp",
        logo: "/assets/blog-covers/yaju-logo-blanco.png",
      },
      {
        href: "/labs/agentic-task-ecosystem",
        label: "Explore agentic work with Yaju",
        cover: "/assets/blog-covers/yaju-blog-cover-10.webp",
        logo: "/assets/blog-covers/yaju-logo-fucsia.png",
      },
    ];

    featuredPromos.forEach(({ href, label, cover, logo }) => {
      document.querySelectorAll(`nav a[href='${href}']`).forEach((link) => {
        if (!link.className.includes("group/featured")) return;
        const coverImage = [...link.querySelectorAll("img")]
          .find((image) => !image.hasAttribute("data-yaju-nav-logo"));
        if (coverImage) {
          if (coverImage.getAttribute("src") !== cover) coverImage.setAttribute("src", cover);
          if (coverImage.getAttribute("srcset") !== cover) coverImage.setAttribute("srcset", cover);
          const media = coverImage.parentElement === link ? link : coverImage.parentElement;
          if (media) {
            media.style.position = "relative";
            media.style.overflow = "hidden";
            let logoImage = media.querySelector(":scope > [data-yaju-nav-logo]");
            if (!logoImage) {
              logoImage = document.createElement("img");
              logoImage.dataset.yajuNavLogo = "true";
              logoImage.alt = "";
              logoImage.setAttribute("aria-hidden", "true");
              media.append(logoImage);
            }
            if (logoImage.getAttribute("src") !== logo) logoImage.setAttribute("src", logo);
            logoImage.removeAttribute("srcset");
            logoImage.style.cssText = "position:absolute;left:50%;top:50%;width:42%;height:auto;transform:translate(-50%,-50%);z-index:2;pointer-events:none;object-fit:contain;filter:drop-shadow(0 2px 8px rgba(0,0,0,.08));";
          }
        }

        const textLabel = [...link.querySelectorAll("span")]
          .find((span) => span.matches(".text-web3-14") && text(span) !== label);
        if (textLabel && !textLabel.closest("a")?.querySelector("img[data-yaju-nav-logo]")) {
          const icon = textLabel.querySelector("i")?.cloneNode(true);
          textLabel.textContent = label;
          if (icon) textLabel.append(" ", icon);
        } else if (textLabel && text(link) !== label) {
          const icon = textLabel.querySelector("i")?.cloneNode(true);
          textLabel.textContent = label;
          if (icon) textLabel.append(" ", icon);
        }
        if (link.getAttribute("aria-label")) link.setAttribute("aria-label", label);
      });
    });
  };

  const patchPage = () => {
    patchNavigation();
    patchBlogCards();
    patchWallpaperCards();

    document.querySelectorAll("a[href*='linkedin.com/company/cap-consultor']").forEach((link) => {
      link.setAttribute("href", "https://www.linkedin.com/company/yaju-as");
    });

    if (path === "/about") {
      ["Foundations", "Early growth", "Research focus", "Agentic AI for the enterprise"].forEach((label) => {
        const heading = [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5")]
          .find((element) => text(element) === label);
        let card = heading?.parentElement;
        while (card && ![...card.children].some((child) => child.classList.contains("left-text-container"))) {
          card = card.parentElement;
        }
        if (!card || card === document.querySelector("main")) return;
        const copy = [...card.children].find((child) => child.classList.contains("left-text-container"));
        [...card.children].forEach((child) => {
          if (child !== copy && child.querySelector("img, picture, video")) child.remove();
        });
        if (copy) {
          copy.style.width = "100%";
          copy.style.maxWidth = "800px";
        }
        card.style.justifyContent = "flex-start";
      });
    }

    if (path === "/ai-spend") {
      document.querySelectorAll('main img[alt="Yaju"]').forEach((image) => {
        const frame = image.closest(".campaign-slideshow__media-frame");
        if (frame) frame.remove();
        else image.remove();
      });
    }

    if (path === "/agent-orchestration-system") {
      replaceImage("0b97b9fbc86c4f1cda95b0a8584bbf2576939e1d", "/assets/img/yaju-aos-observability-1360x1360.webp");
      replaceImage("2059b2728fb8289dfacf59866ac72a390de60f31", "/assets/img/yaju-aos-governance-1360x1360.webp");
      replaceImage("0f12a1345518269524f8a63b60d5561a8179ed1c", "/assets/img/yaju-aos-token-monitoring-1360x1360.webp");
    }

    if (path === "/ai-governance") {
      replaceImage("2484012ebc7edefa6a7f2bcd0dfea81529569d38", "/assets/img/yaju-governance-encryption-1128x1128.webp");
    }

    if (path === "/mcp-gateway") {
      replaceImage("dcd7b076c1e919ec24e90fad1f112fd295cb3d72", "/assets/img/yaju-mcp-policy-1128x1128.webp");
    }

    if (path === "/ai-spend-explorer") {
      if (document.readyState === "complete") {
        const video = document.querySelector("main video[src*='jQkiowhjcNANEVOdEj02JRdSnvM5TaFudLXF9BmyAVms']");
        video?.closest("section")?.remove();
      }
    }

    if (path === "/developers") {
      replaceImage("cfe4f577b190a8ee82694d68fbb94f93db2d79c2", "/assets/img/yaju-developers-silos-1360x1360.webp");
      replaceImage("e71cec66475d467b4c439f956c31b9370bbd45e8", "/assets/img/yaju-developers-roi-1360x1360.webp");
    }

    if (path === "/solutions/financial-services") {
      replaceImage("cfe4f577b190a8ee82694d68fbb94f93db2d79c2", "/assets/img/yaju-financial-evidence-1360x1360.webp");
      replaceImage("e71cec66475d467b4c439f956c31b9370bbd45e8", "/assets/img/yaju-financial-cost-1360x1360.webp");
    }

    if (path === "/solutions/public-sector") {
      replaceImage("a9a018529f9faf6586aee63094595844c20406c8", "/assets/img/yaju-public-access-1360x1360.webp");
      replaceImage("d913223c52c3a4e27215ec1faffca0432a7af421", "/assets/img/yaju-public-evidence-1360x1360.webp");
    }

    if (path === "/solutions/engineering") {
      replaceImage("e6d76cc77d1e49e03db5119e0b82632d0971091a", "/assets/img/yaju-engineering-cli-photo-1360x1360.webp");
      replaceImage("140f8c317688d03c3fe8a17414a50b20bb4b41d5", "/assets/img/yaju-engineering-catalogue-photo-1360x1360.webp");
      roundImage(document.querySelector("main img[src*='yaju-engineering-cli-photo-1360x1360']"), "22px");
      roundImage(document.querySelector("main img[src*='yaju-engineering-catalogue-photo-1360x1360']"), "22px");
    }

    if (path === "/solutions/telecommunications") {
      replaceImage("65536a6029c597568dae940f5fbf6bd012de397c", "/assets/img/yaju-telecom-trace-1360x1360.webp");
      replaceImage("efbda42da49d00e5d8edcfb6ae400d5816194780", "/assets/img/yaju-telecom-spend-1360x1360.webp");

      if (document.readyState === "complete") {
        const heading = [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5")]
          .find((element) => text(element) === "The Agent Orchestration System underneath every team");
        const headingSection = heading?.closest("section");
        let videoSection = headingSection?.nextElementSibling;
        while (videoSection && !videoSection.querySelector("video, button[aria-label='Play video']")) {
          videoSection = videoSection.nextElementSibling;
        }
        videoSection?.remove();
        headingSection?.remove();
      }
    }

    if (path === "/solutions/healthcare-and-life-sciences") {
      replaceImage("9eff3ee4db7a342c15a67c1d7539154d97794fa1", "/assets/img/yaju-health-evidence-photo-1360x1360.webp");
      replaceImage("2a965ccc4817b8ee2147b283520096be069cde35", "/assets/img/yaju-health-catalogue-photo-1360x1360.webp");
      roundImage(document.querySelector("main img[src*='yaju-health-evidence-photo-1360x1360']"), "22px");
      roundImage(document.querySelector("main img[src*='yaju-health-catalogue-photo-1360x1360']"), "22px");
    }

    if (path === "/solutions/manufacturing") {
      replaceImage("9612ef09adf145a1117181f767a7c366d0829bfc", "/assets/img/yaju-manufacturing-trace-1360x1360.webp");
      replaceImage("3547fd834a2690332b1b6d133e05b1aaa5dfe94f", "/assets/img/yaju-manufacturing-spend-1360x1360.webp");
    }

    if (path === "/labs") {
      const heading = [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5")]
        .find((element) => text(element) === "Agent Orchestration System");
      let block = heading?.parentElement;
      while (block && !block.querySelector("a") && block !== document.querySelector("main")) block = block.parentElement;
      block?.querySelectorAll("a").forEach((link) => {
        if (text(link).startsWith("Learn more")) link.setAttribute("href", "/agent-orchestration-system");
      });
    }

    if (path === "/agent-academy") renderAgentAcademy();

    if (path === "/labs/futures-of-work") {
      removeMainLinks(["Read the paper", "Read the paper "]);
      document.querySelectorAll("main a[href*='arxiv.org/abs/2606.23633']").forEach((link) => link.remove());
      document.querySelectorAll("main a[href='/labs/agentic-task-ecosystem']").forEach((link) => {
        const icon = [...link.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.nodeValue.includes("\ue906"));
        [...link.childNodes].filter((node) => node.nodeType === Node.TEXT_NODE).forEach((node, index) => {
          node.nodeValue = index === 0 ? "Agentic task ecosystem" : node === icon ? " \ue906" : "";
        });
        if (!text(link).includes("Agentic task ecosystem")) link.textContent = "Agentic task ecosystem";
      });
    }

    if (path === "/careers") {
      replaceImage("d524475e79935fad07549fff10f04c691e767e8e", "/assets/img/yaju-careers-hero-882x1120.webp");
      replaceImage("9f29f16467315f73ca9f9bf907912ea863a6fbdf", "/assets/img/yaju-careers-benefits-1360x1360.webp");
      replaceImage("f8f7d91a4c9b8f5314f4ea32e450b342eef330c9", "/assets/img/yaju-careers-culture-1360x1360.webp");
      replaceImage("656842f6e08943f18a31d4c34b19ce585ffc878b", "/assets/img/yaju-careers-working-1360x1360.webp");

      const locationsHeading = [...document.querySelectorAll("main h1, main h2, main h3, main h4, main h5")]
        .find((element) => text(element).includes("Born in Barcelona BCN Building worldwide"));
      const locationsSection = locationsHeading?.closest("section")?.nextElementSibling;
      const locationLogos = [
        ["/assets/blog-covers/yaju-logo-turquesa.png", "#f4f3ee"],
        ["/assets/blog-covers/yaju-logo-fucsia.png", "#f6e9f3"],
        ["/assets/blog-covers/yaju-logo-rosa-claro.png", "#4c1745"],
        ["/assets/blog-covers/yaju-logo-negro.png", "#f4f3ee"],
        ["/assets/blog-covers/yaju-logo-blanco.png", "#171717"],
      ];
      locationsSection?.querySelectorAll("img").forEach((image, index) => {
        const [logoPath, background] = locationLogos[index % locationLogos.length];
        if (image.getAttribute("src") !== logoPath) image.setAttribute("src", logoPath);
        if (image.getAttribute("srcset") !== logoPath) image.setAttribute("srcset", logoPath);
        image.alt = "Yaju logo";
        image.style.objectFit = "contain";
        image.style.padding = "12px";
        image.style.boxSizing = "border-box";
        const frame = image.parentElement;
        if (frame) frame.style.background = background;
      });
    }

    if (path === "/labs/agentic-task-ecosystem") {
      removeMainLinks(["Explore the dataset", "Explore the dataset \ue906", "Read the paper"]);
      document.querySelectorAll("main a[href*='arxiv.org/abs/2606.23633']").forEach((link) => link.remove());
      replaceImage("e15da69ed56ce38c19dbeb973c8519b608a1e5b2", "/assets/img/yaju-agentic-ecosystem-tools-1240x960.webp");
      replaceImage("f918f98041abac6ae82f7268a5f318bd7c261e2c", "/assets/img/yaju-agentic-task-change-1240x960.webp");
      replaceImage("01f98af8945a1ca93ecce135b3c1b56bd8c5a870", "/assets/img/yaju-agentic-insights-1240x960.webp");
      document.querySelectorAll("main img[src*='yaju-agentic-']").forEach((image) => roundImage(image));
    }

    if (path === "/labs/scholars") {
      replaceImage("4c9c873cbc2ad78cb29033278777bb9e756c1563", "/assets/img/yaju-scholars-about-1781x1188.webp");
      const aboutImage = document.querySelector("main img[src*='yaju-scholars-about-1781x1188']");
      roundImage(aboutImage, "20px");
      const frame = aboutImage?.parentElement;
      const siblingFrame = frame?.nextElementSibling;
      if (aboutImage) {
        aboutImage.style.clipPath = "inset(0 round 20px)";
        aboutImage.style.boxSizing = "border-box";
      }
      if (frame) {
        frame.style.flex = "1.6 1 0%";
        frame.style.borderRadius = "20px";
        frame.style.clipPath = "inset(0 round 20px)";
        frame.style.border = "1px solid rgba(23, 23, 28, 0.14)";
        frame.style.boxSizing = "border-box";
        frame.style.overflow = "hidden";
      }
      if (siblingFrame) siblingFrame.style.flex = "0.7 1 0%";
    }

    if (path === "/labs/oran") {
      removeMainLinks([
        "Versions",
        "Sign up for our newsletter",
        "Cost attributed per agent",
        "Reported in dollars",
        "Budgets per workspace",
        "Automatic block at the limit",
        "Keter and Nahar",
        "Watch more videos",
      ]);
      document.querySelectorAll("main *").forEach((element) => {
        if (element.children.length === 0 && text(element) === "Featured videos") element.textContent = "Featured content";
      });
      replaceImage("4b6f490691387c242802b7eb7d3700c89e743998", "/assets/img/yaju-oran-32-leaves-1360x1360.webp");
      replaceImage("aa9c84494d51421effc5ffd145bf2454242dea9c", "/assets/img/yaju-oran-earlier-leaves-1360x1360.webp");
      document.querySelectorAll("main img[src*='yaju-oran-']").forEach((image) => roundImage(image));
    }

    if (path === "/labs/open-development") {
      document.querySelectorAll("main a").forEach((link) => {
        if (text(link) === "Join us") link.setAttribute("href", "/contact-sales");
      });
      removeMainLinks(["Watch more videos"]);
      replaceImage("b38bd724b0fc2bd627456ad17d7f749f80151e42", "/assets/img/yaju-open-development-map-1360x1360.webp");
      replaceImage("5425a0d616e640863efa7e56f9cbed4acd32b54e", "/assets/img/yaju-open-development-connect-1360x1360.webp");
      replaceImage("b5ffb50faccedf070257c0845c37e63c580364dd", "/assets/img/yaju-open-development-grow-1360x1360.webp");
      replaceImage("232eed87659857ce9f6cff7638bfd5da409d39f0", "/assets/img/yaju-open-development-collaborate-1360x1360.webp");
    }

    if (path === "/labs/catalyst-grants") {
      document.querySelectorAll("main a").forEach((link) => {
        if (text(link) === "Apply now") link.setAttribute("href", "/contact-sales");
      });
    }
  };

  const startPatches = () => {
    patchPage();
    window.setTimeout(patchPage, 500);
    window.setTimeout(patchPage, 1500);

    let patchScheduled = false;
    new MutationObserver(() => {
      if (patchScheduled) return;
      patchScheduled = true;
      window.requestAnimationFrame(() => {
        patchScheduled = false;
        patchPage();
      });
    }).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["src", "srcset"],
    });
  };

  const startAfterHydration = () => window.setTimeout(startPatches, 750);
  if (document.readyState === "complete") startAfterHydration();
  else window.addEventListener("load", startAfterHydration, { once: true });
})();
