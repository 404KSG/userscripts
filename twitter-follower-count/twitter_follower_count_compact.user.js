// ==UserScript==
// @name         Twitter Follower Count Compact
// @namespace    amm1rr.com.twitter.follower.count.compact
// @version      0.5.5
// @homepage     https://github.com/Amm1rr/Twitter-Follower-Count/
// @description  Display compact follower counts on X/Twitter avatars
// @author       Mohammad Khani (@m_khani65), compact tweaks by Qingqi
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-start
// @grant        none
// @license      MIT
// ==/UserScript==

(function () {
  "use strict";

  const SCRIPT_VERSION = "0.5.5";
  const STYLE_ID = "tfc-compact-style";
  const AVATAR_CLASS = "tfc-avatar";
  const RING_CLASS = "tfc-ring";
  const BADGE_CLASS = "tfc-count";
  const TIER_CLASSES = [
    "tfc-tier-gray",
    "tfc-tier-green",
    "tfc-tier-blue",
    "tfc-tier-purple",
    "tfc-tier-orange",
    "tfc-tier-red",
    "tfc-tier-blackgold",
  ];
  const RESERVED_ROUTES = new Set([
    "home",
    "explore",
    "i",
    "messages",
    "notifications",
    "settings",
  ]);
  const MAX_CACHE_SIZE = 2000;
  const userCache = new Map();
  const TIER_STYLES = {
    gray: {
      ring: "rgba(83, 100, 113, 0.5)",
      glow: "rgba(83, 100, 113, 0.16)",
      badgeBg: "rgba(83, 100, 113, 0.92)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    green: {
      ring: "rgba(0, 186, 124, 0.72)",
      glow: "rgba(0, 186, 124, 0.2)",
      badgeBg: "rgba(0, 186, 124, 0.94)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    blue: {
      ring: "rgba(29, 155, 240, 0.74)",
      glow: "rgba(29, 155, 240, 0.22)",
      badgeBg: "rgba(29, 155, 240, 0.94)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    purple: {
      ring: "rgba(120, 86, 255, 0.76)",
      glow: "rgba(120, 86, 255, 0.24)",
      badgeBg: "rgba(120, 86, 255, 0.94)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    orange: {
      ring: "rgba(255, 122, 0, 0.82)",
      glow: "rgba(255, 122, 0, 0.26)",
      badgeBg: "rgba(255, 122, 0, 0.94)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    red: {
      ring: "rgba(244, 33, 46, 0.84)",
      glow: "rgba(244, 33, 46, 0.28)",
      badgeBg: "rgba(244, 33, 46, 0.94)",
      badgeBorder: "rgba(255, 255, 255, 0.9)",
      badgeFg: "#fff",
      badgeTextShadow: "0 1px 1px rgba(15, 20, 25, 0.18)",
    },
    blackgold: {
      ring: "rgba(15, 20, 25, 0.92)",
      glow: "rgba(255, 212, 89, 0.34)",
      badgeBg: "rgba(15, 20, 25, 0.94)",
      badgeBorder: "rgba(255, 212, 89, 0.92)",
      badgeFg: "rgb(255, 224, 128)",
      badgeTextShadow: "0 1px 1px rgba(0, 0, 0, 0.45)",
    },
  };

  const normalizeScreenName = (screenName) =>
    String(screenName || "").replace(/^@/, "").toLowerCase();

  const formatFollowers = (number) => {
    const count = Number(number);
    if (!Number.isFinite(count)) return "";

    const trim = (value) => value.toFixed(1).replace(/\.0$/, "");

    if (count >= 999_500) return `${trim(count / 1_000_000)}M`;
    if (count >= 100_000) return `${Math.round(count / 1_000)}K`;
    if (count >= 10_000) return `${trim(count / 1_000)}K`;
    if (count >= 1_000) return `${trim(count / 1_000)}K`;

    return count.toLocaleString("en-US");
  };

  const formatFullFollowers = (number) =>
    Number(number).toLocaleString("en-US");

  const getFollowerTier = (number) => {
    const count = Number(number);
    if (count >= 100_000_000) return "blackgold";
    if (count >= 10_000_000) return "red";
    if (count >= 1_000_000) return "orange";
    if (count >= 100_000) return "purple";
    if (count >= 10_000) return "blue";
    if (count >= 1_000) return "green";
    return "gray";
  };

  const getAvatarShape = (user) => {
    const shape = String(
      user.profile_image_shape ||
        user.avatar_shape ||
        user.avatar?.image_shape ||
        user.avatar?.shape ||
        findDeepValue(user, [
          "profile_image_shape",
          "image_shape",
          "avatar_shape",
          "avatarShape",
        ]) ||
        ""
    ).toLowerCase();

    if (shape.includes("square")) return "square";
    if (shape.includes("circle") || shape.includes("round")) return "circle";

    const verifiedType = String(
      user.verified_type ||
        user.verification_type ||
        user.verifiedType ||
        user.organization_type ||
        findDeepValue(user, [
          "verified_type",
          "verification_type",
          "verifiedType",
          "organization_type",
        ]) ||
        ""
    ).toLowerCase();

    if (
      ["business", "organization", "government", "affiliate"].some((type) =>
        verifiedType.includes(type)
      )
    ) {
      return "square";
    }

    const organizationFlag = String(
      findDeepValue(user, [
        "is_business_account",
        "is_organization",
        "is_government",
        "isGovernment",
      ]) || ""
    ).toLowerCase();
    if (organizationFlag === "true") return "square";

    return "unknown";
  };

  const findDeepValue = (obj, keys, seen = new WeakSet(), depth = 0) => {
    if (!obj || typeof obj !== "object" || seen.has(obj) || depth > 8) {
      return undefined;
    }
    seen.add(obj);
    const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()));

    for (const [key, value] of Object.entries(obj)) {
      if (!normalizedKeys.has(key.toLowerCase())) continue;
      if (typeof value === "string" && value.trim()) return value;
      if (typeof value === "number" || typeof value === "boolean") return String(value);
    }

    for (const value of Object.values(obj)) {
      const found = findDeepValue(value, keys, seen, depth + 1);
      if (found !== undefined) return found;
    }

    return undefined;
  };

  const extractAvatarShapeFields = (obj, legacy = {}) => ({
    profile_image_shape:
      obj.profile_image_shape ||
      legacy.profile_image_shape ||
      findDeepValue(obj, ["profile_image_shape", "image_shape"]),
    avatar_shape:
      obj.avatar_shape ||
      legacy.avatar_shape ||
      obj.avatar?.image_shape ||
      obj.avatar?.shape ||
      findDeepValue(obj, ["avatar_shape", "avatarShape"]),
    verified_type:
      legacy.verified_type ||
      obj.verified_type ||
      obj.verification_type ||
      obj.verifiedType ||
      obj.organization_type ||
      obj.verification_info?.verified_type ||
      obj.verification_info?.verification_type ||
      findDeepValue(obj, [
        "verified_type",
        "verification_type",
        "verifiedType",
        "organization_type",
      ]),
  });

  const trimUserCache = () => {
    while (userCache.size > MAX_CACHE_SIZE) {
      const oldestKey = userCache.keys().next().value;
      userCache.delete(oldestKey);
    }
  };

  const ensureStyles = () => {
    let style = document.getElementById(STYLE_ID);
    if (!style) {
      style = document.createElement("style");
      style.id = STYLE_ID;
      (document.head || document.documentElement).appendChild(style);
    }
    if (style.dataset.tfcVersion === SCRIPT_VERSION) return;

    style.textContent = `
      .${AVATAR_CLASS} {
        --tfc-ring-radius: 9999px;
        position: relative !important;
        overflow: visible !important;
      }

      .${RING_CLASS} {
        position: absolute;
        inset: -3px;
        z-index: 2;
        box-sizing: border-box;
        border: 2px solid rgba(83, 100, 113, 0.5);
        border-radius: var(--tfc-ring-radius, 9999px);
        opacity: 1 !important;
        visibility: visible !important;
        box-shadow:
          inset 0 0 0 1px rgba(255, 255, 255, 0.92),
          0 0 0 1px rgba(255, 255, 255, 0.86),
          0 0 10px rgba(83, 100, 113, 0.16);
        pointer-events: none;
        transition: none !important;
        animation: none !important;
      }

      .${BADGE_CLASS} {
        position: absolute;
        top: -10px;
        left: 50%;
        transform: translateX(-50%);
        z-index: 4;
        box-sizing: border-box;
        max-width: 54px;
        min-width: 22px;
        height: 15px;
        padding: 0 5px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.9);
        border-radius: 999px;
        background: rgba(83, 100, 113, 0.92);
        box-shadow:
          0 2px 5px rgba(15, 20, 25, 0.22),
          0 0 0 0.5px rgba(255, 255, 255, 0.2);
        backdrop-filter: blur(8px) saturate(150%);
        -webkit-backdrop-filter: blur(8px) saturate(150%);
        color: #fff;
        font: 750 9.5px/14px -apple-system, BlinkMacSystemFont, "Segoe UI",
          Roboto, Helvetica, Arial, sans-serif;
        letter-spacing: 0;
        text-align: center;
        text-overflow: ellipsis;
        text-shadow: 0 1px 1px rgba(15, 20, 25, 0.18);
        white-space: nowrap;
        pointer-events: none;
        opacity: 1 !important;
        visibility: visible !important;
        transition: none !important;
        animation: none !important;
      }

      .${AVATAR_CLASS}:hover .${RING_CLASS},
      .${AVATAR_CLASS}:focus .${RING_CLASS},
      .${AVATAR_CLASS}:active .${RING_CLASS},
      .${AVATAR_CLASS}:hover .${BADGE_CLASS},
      .${AVATAR_CLASS}:focus .${BADGE_CLASS},
      .${AVATAR_CLASS}:active .${BADGE_CLASS} {
        opacity: 1 !important;
        visibility: visible !important;
      }

    `;
    style.dataset.tfcVersion = SCRIPT_VERSION;
  };

  const getScreenNameFromProfileHref = (href) => {
    try {
      const url = new URL(href, location.origin);
      if (url.origin !== location.origin) return "";

      const [screenName, secondSegment] = url.pathname
        .split("/")
        .filter(Boolean);

      if (!screenName || secondSegment || RESERVED_ROUTES.has(screenName)) return "";

      return normalizeScreenName(screenName);
    } catch {
      return "";
    }
  };

  const cacheUserData = (user) => {
    const screenName = normalizeScreenName(user.screen_name);
    const followersCount = Number(user.followers_count);

    if (!screenName || !Number.isFinite(followersCount)) return;

    if (userCache.has(screenName)) {
      userCache.delete(screenName);
    }

    userCache.set(screenName, {
      name: user.name,
      screen_name: screenName,
      followers_count: followersCount,
      formatted_followers_count: formatFollowers(followersCount),
      full_followers_count: formatFullFollowers(followersCount),
      follower_tier: getFollowerTier(followersCount),
      avatar_shape: getAvatarShape(user),
      verified_type: user.verified_type,
      friends_count: user.friends_count,
    });
    trimUserCache();
  };

  const extractUsersFromAPI = (obj, result = [], seen = new WeakSet()) => {
    if (!obj || typeof obj !== "object" || seen.has(obj)) return result;
    seen.add(obj);

    const legacy = obj.legacy;
    const core = obj.core;

    if (legacy && typeof legacy === "object") {
      const screenName = core?.screen_name || legacy.screen_name || obj.screen_name;
      const followersCount = legacy.followers_count ?? obj.followers_count;

      if (screenName && followersCount !== undefined) {
        const shapeFields = extractAvatarShapeFields(obj, legacy);
        result.push({
          name: core?.name || legacy.name || obj.name,
          screen_name: screenName,
          followers_count: followersCount,
          friends_count: legacy.friends_count ?? obj.friends_count,
          ...shapeFields,
        });
      }
    }

    if (obj.screen_name && obj.followers_count !== undefined) {
      result.push(obj);
    }

    for (const value of Object.values(obj)) {
      if (value && typeof value === "object") {
        extractUsersFromAPI(value, result, seen);
      }
    }

    return result;
  };

  const processResponseText = (responseText) => {
    if (!responseText) return;
    if (
      !responseText.includes("followers_count") &&
      !responseText.includes("screen_name")
    ) {
      return;
    }

    try {
      extractUsersFromAPI(JSON.parse(responseText)).forEach(cacheUserData);
      debouncedUpdateFollowerCounts();
    } catch {
      // Some API responses are not JSON; ignore them.
    }
  };

  const decodeResponse = (xhr) => {
    if (xhr.responseType === "" || xhr.responseType === "text") {
      return xhr.responseText;
    }

    if (xhr.responseType === "arraybuffer") {
      return new TextDecoder("utf-8").decode(xhr.response);
    }

    return null;
  };

  const patchXMLHttpRequest = () => {
    const originalSend = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.send = function (...args) {
      this.addEventListener("load", () => {
        if (!this.responseURL?.includes("/i/api/")) return;
        processResponseText(decodeResponse(this));
      });

      return originalSend.apply(this, args);
    };
  };

  const patchFetch = () => {
    if (!window.fetch) return;

    const originalFetch = window.fetch;
    window.fetch = async (...args) => {
      const response = await originalFetch(...args);
      const url = response.url || String(args[0] || "");

      if (url.includes("/i/api/")) {
        response
          .clone()
          .text()
          .then(processResponseText)
          .catch(() => {});
      }

      return response;
    };
  };

  const createFollowerCountElement = (formattedCount) => {
    const span = document.createElement("span");
    span.className = BADGE_CLASS;
    span.textContent = formattedCount;
    return span;
  };

  const createRingElement = () => {
    const span = document.createElement("span");
    span.className = RING_CLASS;
    return span;
  };

  const setImportantStyle = (element, property, value) => {
    element.style.setProperty(property, value, "important");
  };

  const syncDecorationStyles = (link, user) => {
    let ring = link.querySelector(`.${RING_CLASS}`);
    if (!ring) {
      ring = createRingElement();
      link.prepend(ring);
    }

    let badge = link.querySelector(`.${BADGE_CLASS}`);
    if (!badge) {
      badge = createFollowerCountElement(user.formatted_followers_count);
      link.appendChild(badge);
    } else if (badge.textContent !== user.formatted_followers_count) {
      badge.textContent = user.formatted_followers_count;
    }

    const style = TIER_STYLES[user.follower_tier] || TIER_STYLES.gray;
    setImportantStyle(ring, "border-color", style.ring);
    setImportantStyle(
      ring,
      "box-shadow",
      `inset 0 0 0 1px rgba(255, 255, 255, 0.92), 0 0 0 1px rgba(255, 255, 255, 0.86), 0 0 10px ${style.glow}`
    );
    setImportantStyle(badge, "background", style.badgeBg);
    setImportantStyle(badge, "border-color", style.badgeBorder);
    setImportantStyle(badge, "color", style.badgeFg);
    setImportantStyle(badge, "text-shadow", style.badgeTextShadow);
    ring.removeAttribute("title");
    badge.removeAttribute("title");
  };

  const allowBadgeOverflow = (link) => {
    link.style.position ||= "relative";
    link.style.overflow = "visible";

    let node = link.parentElement;
    let depth = 0;
    while (node && depth < 5) {
      node.style.overflow = "visible";
      node.style.clipPath = "none";
      if (node.matches?.('[data-testid="Tweet-User-Avatar"]')) break;
      node = node.parentElement;
      depth += 1;
    }
  };

  const syncAvatarClasses = (link, tier) => {
    const tierClass = `tfc-tier-${tier}`;
    if (
      link.dataset.tfcTier === tier &&
      link.classList.contains(AVATAR_CLASS) &&
      link.classList.contains(tierClass)
    ) {
      return;
    }

    link.classList.add(AVATAR_CLASS);
    TIER_CLASSES.forEach((className) => link.classList.remove(className));
    link.classList.add(tierClass);
    link.dataset.tfcTier = tier;
  };

  const readBorderRadius = (value, size) => {
    if (!value) return 0;
    if (value.endsWith("%")) return (parseFloat(value) / 100) * size;
    return parseFloat(value) || 0;
  };

  const syncAvatarShape = (link, user) => {
    if (user.avatar_shape === "square") {
      link.style.setProperty("--tfc-ring-radius", "10px");
      link.dataset.tfcShapeSynced = "1";
      return;
    }

    if (user.avatar_shape === "circle") {
      link.style.setProperty("--tfc-ring-radius", "9999px");
      link.dataset.tfcShapeSynced = "1";
      return;
    }

    const img = link.querySelector('img[draggable="true"]');
    if (!img) return;

    const { width, height } = img.getBoundingClientRect();
    const size = Math.min(width, height);
    if (!size) return;

    const radius = readBorderRadius(getComputedStyle(img).borderTopLeftRadius, size);
    const isExplicitSquare = radius > 0 && radius < size * 0.35;
    const ringRadius = isExplicitSquare
      ? `${Math.max(Math.round(radius + 3), 8)}px`
      : "9999px";

    link.style.setProperty("--tfc-ring-radius", ringRadius);
    link.dataset.tfcShapeSynced = "1";
  };

  const decorateAvatarLink = (link) => {
    if (!link?.matches?.('a[href^="/"]')) return false;
    if (!link.closest('[data-testid="Tweet-User-Avatar"]')) return false;
    if (link.closest('[data-testid="tweetPhoto"]')) return false;
    if (link.href.includes("/status/") || link.href.includes("/photo/")) return false;
    if (!link.querySelector('img[draggable="true"]')) return false;

    const screenName = getScreenNameFromProfileHref(link.getAttribute("href"));
    if (!screenName) return false;

    const user = userCache.get(screenName);
    if (!user?.formatted_followers_count) return false;

    if (link.dataset.tfcScreenName !== screenName) {
      link.dataset.tfcScreenName = screenName;
      link.removeAttribute("data-tfc-shape-synced");
    }

    allowBadgeOverflow(link);
    syncAvatarClasses(link, user.follower_tier);
    syncAvatarShape(link, user);
    syncDecorationStyles(link, user);
    link.removeAttribute("title");
    return true;
  };

  const updateFollowerCounts = () => {
    if (!document.body || userCache.size === 0) return;
    ensureStyles();

    document
      .querySelectorAll('[data-testid="Tweet-User-Avatar"] a[href^="/"]')
      .forEach(decorateAvatarLink);
  };

  const redecorateHoveredAvatar = (event) => {
    if (userCache.size === 0 || !(event.target instanceof Element)) return;

    const link = event.target.closest(
      '[data-testid="Tweet-User-Avatar"] a[href^="/"]'
    );
    if (!link) return;

    decorateAvatarLink(link);
    requestAnimationFrame(() => decorateAvatarLink(link));
    setTimeout(() => decorateAvatarLink(link), 50);
    setTimeout(() => decorateAvatarLink(link), 150);
  };

  const debounce = (func, delay) => {
    let timeoutId;
    return (...args) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func(...args), delay);
    };
  };

  const debouncedUpdateFollowerCounts = debounce(updateFollowerCounts, 50);

  patchXMLHttpRequest();
  patchFetch();

  window.addEventListener("load", debouncedUpdateFollowerCounts);
  document.addEventListener("scroll", debouncedUpdateFollowerCounts, { passive: true });
  document.addEventListener("mouseover", redecorateHoveredAvatar, true);
  document.addEventListener("focusin", redecorateHoveredAvatar, true);

  const startObserver = () => {
    if (!document.body) {
      requestAnimationFrame(startObserver);
      return;
    }

    const observer = new MutationObserver(debouncedUpdateFollowerCounts);
    observer.observe(document.body, { childList: true, subtree: true });
    debouncedUpdateFollowerCounts();
  };

  startObserver();
})();
