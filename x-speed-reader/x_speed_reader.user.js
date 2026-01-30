// ==UserScript==
// @name         X Speed Reader (Translate Compatible)
// @namespace    http://tampermonkey.net/
// @version      14.0
// @description  X 阅读加速：翻译兼容版 - 链接美化、文本折叠
// @author       You
// @match        https://x.com/*
// @match        https://twitter.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // --- 配置区域 ---
    const CONFIG = {
        // 【关键修改】不再限制行数，而是限制高度。
        // 220px 大约等于 10-11 行文字。
        // 这足够同时显示“一段原文” + “一段翻译”。
        foldHeight: 220,

        linkColor: '#1d9bf0',  // 链接颜色
    };

    const style = document.createElement('style');
    style.textContent = `
        /* === 1. 长文本折叠 (改为高度限制模式) === */
        .xsr-collapsed {
            /* 强制高度限制 */
            max-height: ${CONFIG.foldHeight}px !important;
            overflow: hidden !important;
            position: relative;
            display: block !important; /* 覆盖可能存在的 line-clamp */

            /* 底部渐变遮罩，提示还有内容 */
            mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
            -webkit-mask-image: linear-gradient(to bottom, black 60%, transparent 100%);
        }

        /* 展开/收起 按钮 */
        .xsr-expand {
            color: ${CONFIG.linkColor};
            cursor: pointer;
            font-size: 14px;
            font-weight: bold;
            margin-top: 6px;
            margin-bottom: 12px;
            display: inline-block;
            user-select: none;
        }
        .xsr-expand:hover { text-decoration: underline; }

        /* === 2. 链接卡片美化 (保持不变) === */
        [data-testid="card.wrapper"] { display: none !important; }

        .xsr-link-btn {
            display: flex;
            align-items: center;
            width: 100%;
            max-width: 95%;
            box-sizing: border-box;
            background-color: rgba(29, 155, 240, 0.08);
            border: 1px solid rgba(29, 155, 240, 0.3);
            border-radius: 8px;
            padding: 10px 12px;
            margin: 8px 0;
            text-decoration: none;
            transition: background-color 0.2s;
        }
        .xsr-link-btn:hover {
            background-color: rgba(29, 155, 240, 0.15);
            border-color: ${CONFIG.linkColor};
        }
        .xsr-link-icon { margin-right: 10px; font-size: 16px; flex-shrink: 0; }
        .xsr-link-text {
            color: ${CONFIG.linkColor};
            font-size: 14px;
            font-family: system-ui, -apple-system, sans-serif;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            flex-grow: 1;
        }
    `;
    document.head.appendChild(style);

    // 判断是否需要折叠 (基于高度)
    function isLong(el) {
        // 如果已经被脚本标记折叠，先临时移除类来测量真实高度
        const isCollapsed = el.classList.contains('xsr-collapsed');
        if (isCollapsed) el.classList.remove('xsr-collapsed');

        // 测量高度
        const h = el.scrollHeight;

        // 恢复状态
        if (isCollapsed) el.classList.add('xsr-collapsed');

        // 如果内容高度 > 设定高度 + 50px冗余，才折叠
        return h > CONFIG.foldHeight + 50;
    }

    function process() {
        // --- 逻辑 A: 长文本折叠 ---
        // 每次都重新检查，因为翻译插件可能会动态插入文本导致高度变高
        document.querySelectorAll('[data-testid="tweetText"]').forEach(el => {

            // 1. 检查是否需要处理
            if (!isLong(el)) {
                // 如果变短了（或者翻译没加载出来），确保不要显示按钮
                if (el.getAttribute('data-xsr') === '1') {
                    // 如果以前加过按钮但现在不需要折叠了，可以考虑隐藏按钮(这里简化处理，暂不删除已生成的按钮，避免闪烁)
                }
                return;
            }

            // 2. 避免重复添加按钮
            if (el.getAttribute('data-xsr') === '1') return;
            el.setAttribute('data-xsr', '1');

            // 3. 执行折叠
            el.classList.add('xsr-collapsed');

            // 4. 添加按钮
            const btn = document.createElement('span');
            btn.className = 'xsr-expand';
            btn.textContent = 'Show more'; // 默认文字

            btn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                // 切换 class
                const collapsed = el.classList.toggle('xsr-collapsed');
                // 切换文字
                btn.textContent = collapsed ? 'Show more' : 'Show less';
            };

            // 插入到文本块后面
            el.parentNode.insertBefore(btn, el.nextSibling);
        });

        // --- 逻辑 B: 链接卡片 (保持不变) ---
        document.querySelectorAll('[data-testid="card.wrapper"]:not([data-xsr])').forEach(card => {
            card.setAttribute('data-xsr', '1');
            const linkElement = card.querySelector('a[href]');
            if (!linkElement) return;
            const url = linkElement.href;

            const btn = document.createElement('a');
            btn.className = 'xsr-link-btn';
            btn.href = url;
            btn.target = '_blank';
            btn.rel = 'noopener';
            btn.onclick = (e) => e.stopPropagation();

            btn.innerHTML = `<span class="xsr-link-icon">🔗</span><span class="xsr-link-text">${url}</span>`;
            card.parentNode.insertBefore(btn, card);
        });
    }

    // --- 监听器 ---
    let timer = null;
    const observer = new MutationObserver(() => {
        // 频繁变动（如翻译插件正在逐行插入）时防抖
        if (timer) clearTimeout(timer);
        timer = setTimeout(process, 300);
    });

    observer.observe(document.body, { childList: true, subtree: true });

    // 初始运行
    setTimeout(process, 500);
})();