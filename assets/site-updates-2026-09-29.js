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
  };

  const patchPage = () => {
    patchNavigation();

    if (path === "/ai-spend") {
      const backgroundHashes = [
        "06b1e787f69998777fb0118b8198387be13f54c3",
        "75e6a4f57416d91958addaad0664a5c92ed5ac3f",
        "d36972fd770aaf2bce128c81a1caefc40ac95d76",
        "28933ea3fd936ee6cd5e15db0ab4c4429656a10c",
        "873099d41649a3aaa2a80fce9172b6bc6d75d33f",
      ];
      document.querySelectorAll("main img").forEach((image) => {
        const source = image.currentSrc || image.src;
        if (backgroundHashes.some((hash) => source.includes(hash))) image.remove();
      });
    }

    if (path === "/labs/agentic-task-ecosystem") {
      removeMainLinks(["Explore the dataset", "Explore the dataset \ue906", "Read the paper"]);
      document.querySelectorAll("main a[href*='arxiv.org/abs/2606.23633']").forEach((link) => link.remove());
      replaceImage("e15da69ed56ce38c19dbeb973c8519b608a1e5b2", "/assets/img/yaju-agentic-ecosystem-tools-1240x960.webp");
      replaceImage("f918f98041abac6ae82f7268a5f318bd7c261e2c", "/assets/img/yaju-agentic-task-change-1240x960.webp");
      replaceImage("01f98af8945a1ca93ecce135b3c1b56bd8c5a870", "/assets/img/yaju-agentic-insights-1240x960.webp");
    }

    if (path === "/labs/scholars") {
      replaceImage("4c9c873cbc2ad78cb29033278777bb9e756c1563", "/assets/img/yaju-scholars-about-1781x1188.webp");
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
