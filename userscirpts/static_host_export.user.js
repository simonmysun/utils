// ==UserScript==
// @name         static host export
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  append text url
// @author       You
// @updateURL    https://github.com/simonmysun/utils/raw/refs/heads/gh-pages/userscirpts/static_host_export.user.js
// @downloadURL  https://github.com/simonmysun/utils/raw/refs/heads/gh-pages/userscirpts/static_host_export.user.js
// @supportURL   https://github.com/simonmysun/utils/issues
// @match        https://psb46805.seedbox.io/files/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=seedbox.io
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const pre = document.querySelector('pre');
    if (!pre) return;

    // 1. 解析 <pre> 标签中的每一行（提取链接、时间、大小）
    const links = Array.from(pre.querySelectorAll('a'));
    const entries = links.map(a => {
        const href = a.getAttribute('href');
        const isParent = href === '../';
        let date = 0;
        let size = 0;
        let textNode = null;

        // 查找 <a> 标签后面的文本节点（包含日期和大小信息）
        if (a.nextSibling && a.nextSibling.nodeType === Node.TEXT_NODE) {
            textNode = a.nextSibling;
            // 匹配 Nginx 默认的 autoindex 格式: "29-Jan-2026 13:57          1227747802"
            const match = textNode.textContent.match(/(\d{2}-[a-zA-Z]{3}-\d{4}\s+\d{2}:\d{2})\s+(\d+)/);
            if (match) {
                date = new Date(match[1]).getTime();
                size = parseInt(match[2], 10);
            }
        }
        return { element: a, textNode, name: href, date, size, isParent };
    });

    // 2. 创建用于放置 mpv 链接的容器块
    const mpvContainer = document.createElement('pre');
    mpvContainer.style.cssText = 'background: #f4f4f4; padding: 15px; border: 1px solid #ccc; margin-top: 20px; white-space: pre-wrap; word-break: break-all;';
    document.body.appendChild(mpvContainer);

    // 3. 渲染函数：同时更新页面的文件列表和底部的 mpv 链接
    function render(sortedEntries) {
        // 重绘原生列表
        pre.innerHTML = '';
        sortedEntries.forEach(e => {
            pre.appendChild(e.element);
            if (e.textNode) {
                pre.appendChild(e.textNode);
            } else if (e.isParent) {
                pre.appendChild(document.createTextNode('\n')); // 确保父目录后有换行
            }
        });

        // 提取普通文件并生成带有密码和 '@' 的 mpv 链接
        const urls = sortedEntries
            .filter(e => !e.isParent && !e.name.endsWith('/')) // 排除返回上一级和文件夹
            .map(e => `mpv '${e.element.href.replace('https://', 'https://user:pass@')}'`);
        mpvContainer.innerText = urls.join('\n');
    }

    // 4. 添加排序逻辑与控制按钮
    let currentSort = '';
    let isAscending = true;

    const btnContainer = document.createElement('div');
    btnContainer.style.margin = '15px 0';

    ['Name', 'Time', 'Size'].forEach(type => {
        const btn = document.createElement('button');
        btn.innerText = `Sort by ${type}`;
        btn.style.cssText = 'margin-right: 10px; padding: 5px 15px; cursor: pointer; font-family: sans-serif;';
        btn.onclick = () => {
            // 点击切换升序/降序
            if (currentSort === type) {
                isAscending = !isAscending;
            } else {
                currentSort = type;
                isAscending = true;
            }

            const parent = entries.filter(e => e.isParent);
            const files = entries.filter(e => !e.isParent);
            console.log('here')

            // 执行排序
            files.sort((a, b) => {
                let cmp = 0;
                if (type === 'Name') cmp = a.name.localeCompare(b.name);
                if (type === 'Time') cmp = a.date - b.date;
                if (type === 'Size') cmp = a.size - b.size;
                return isAscending ? cmp : -cmp;
            });

            // 保持 ../ 永远在最前面
            render(parent.concat(files));
        };
        btnContainer.appendChild(btn);
    });

    // 将按钮组插入到原始列表的上方
    document.body.insertBefore(btnContainer, pre);

    // 首次加载时按照原始顺序渲染一次链接块
    render(entries);
})();
