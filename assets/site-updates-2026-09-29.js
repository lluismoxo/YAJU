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

  const decorateAgentAcademy = () => {
    const main = document.querySelector("main");
    if (!main) return;
    main.classList.add("yaju-agent-academy-new");

    const hero = main.querySelector("section");
    const heading = hero?.querySelector("h1");
    if (heading && !hero.querySelector("[data-academy-kicker]")) {
      const kicker = document.createElement("p");
      kicker.dataset.academyKicker = "true";
      kicker.textContent = "AGENT ACADEMY";
      kicker.style.cssText = "margin:0 0 18px;color:#ffb38b;font-size:12px;font-weight:600;letter-spacing:.14em;";
      heading.before(kicker);
    }

    if (hero && !main.querySelector("[data-academy-overview]")) {
      const overview = document.createElement("section");
      overview.dataset.academyOverview = "true";
      overview.className = "academy-overview";
      overview.innerHTML = `
        <div><strong>8</strong><span>Progressive modules</span></div>
        <div><strong>0</strong><span>Prior experience required</span></div>
        <div><strong>1</strong><span>Production-ready foundation</span></div>`;
      hero.insertAdjacentElement("afterend", overview);
    }

    main.querySelectorAll("[id^='module-']").forEach((module, index) => {
      module.classList.add("academy-module-card");
      module.dataset.academyTone = String(index % 3);
    });

    if (!document.getElementById("yaju-agent-academy-styles")) {
      const style = document.createElement("style");
      style.id = "yaju-agent-academy-styles";
      style.textContent = `
        .yaju-agent-academy-new > section:first-of-type { min-height: min(760px, 86vh); }
        .yaju-agent-academy-new > section:first-of-type video { border: 0 !important; border-radius: 18px !important; box-shadow: 0 24px 70px rgba(0,0,0,.28); }
        .academy-overview { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:1px; margin:0; padding:0 3rem; background:#d9d8d2; }
        .academy-overview > div { display:flex; flex-direction:column; gap:8px; padding:42px 32px; background:#f4f3ee; }
        .academy-overview strong { font-size:clamp(34px,4vw,64px); font-weight:400; line-height:1; color:#181818; }
        .academy-overview span { color:#565650; font-size:14px; }
        .academy-module-card { margin-bottom:28px !important; padding:clamp(28px,5vw,64px) !important; border-radius:24px; overflow:hidden; }
        .academy-module-card[data-academy-tone='0'] { background:#f3f1ec; }
        .academy-module-card[data-academy-tone='1'] { background:#eef0f8; }
        .academy-module-card[data-academy-tone='2'] { background:#f6eee9; }
        .academy-module-card h5 { font-size:clamp(28px,4vw,52px) !important; line-height:1.05 !important; margin-bottom:28px !important; }
        .academy-module-card p { max-width:780px; font-size:clamp(15px,1.3vw,18px) !important; line-height:1.65 !important; }
        @media (max-width: 767px) {
          .academy-overview { grid-template-columns:1fr; padding:0 20px; }
          .academy-overview > div { padding:28px 24px; }
          .academy-module-card { border-radius:16px; }
        }
      `;
      document.head.append(style);
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
      replaceImage("e6d76cc77d1e49e03db5119e0b82632d0971091a", "/assets/img/yaju-engineering-cli-1360x1360.webp");
      replaceImage("140f8c317688d03c3fe8a17414a50b20bb4b41d5", "/assets/img/yaju-engineering-catalogue-1360x1360.webp");
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
      replaceImage("9eff3ee4db7a342c15a67c1d7539154d97794fa1", "/assets/img/yaju-health-evidence-1360x1360.webp");
      replaceImage("2a965ccc4817b8ee2147b283520096be069cde35", "/assets/img/yaju-health-catalogue-1360x1360.webp");
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

    if (path === "/agent-academy") decorateAgentAcademy();

    if (path === "/labs/futures-of-work") {
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
      roundImage(document.querySelector("main img[src*='yaju-scholars-about-1781x1188']"));
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

  patchPage();
  window.addEventListener("DOMContentLoaded", patchPage, { once: true });
  window.setTimeout(patchPage, 250);
  window.setTimeout(patchPage, 1200);
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
})();
