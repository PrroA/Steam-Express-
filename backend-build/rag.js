"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.retrieveRagContext = retrieveRagContext;
const staticKnowledge = [
    {
        id: 'faq-payment-001',
        title: '付款方式',
        type: 'faq',
        content: '平台目前提供模擬付款流程。若付款失敗，訂單會進入付款失敗狀態，可在結帳頁重新付款。',
    },
    {
        id: 'faq-order-002',
        title: '訂單狀態說明',
        type: 'faq',
        content: '訂單狀態包含：未付款、付款失敗、已付款、已取消、已退款。每張訂單都會記錄狀態時間軸。',
    },
    {
        id: 'policy-refund-003',
        title: '退款與取消',
        type: 'policy',
        content: '未付款或付款失敗的訂單可取消。已付款訂單可申請退款。取消與退款會回補商品庫存。',
    },
    {
        id: 'policy-account-004',
        title: '帳號與登入',
        type: 'policy',
        content: '使用者需先登入才能使用購物車、願望清單、下單與訂單查詢功能。',
    },
    {
        id: 'policy-security-005',
        title: '平台安全',
        type: 'policy',
        content: '平台 API 具備 request id、基礎 rate limit 與統一錯誤格式，方便追蹤問題。',
    },
];
function buildCatalogDocuments(state) {
    return state.games
        .filter((game) => game.isActive !== false)
        .map((game) => {
        const variantText = game.variants && game.variants.length > 0
            ? game.variants
                .map((variant) => `${variant.name} 價格 ${variant.price} 庫存 ${variant.stock}`)
                .join('；')
            : '無版本資料';
        return {
            id: `catalog-game-${game.id}`,
            title: game.name,
            type: 'catalog',
            content: `${game.name}。描述：${game.description}。基礎價格：${game.price}。版本：${variantText}`,
        };
    });
}
function extractTerms(text) {
    const baseTerms = text
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter((term) => term.length >= 2);
    const cjkChars = (text.match(/[\u4e00-\u9fff]/g) || []).join('');
    const cjkBigrams = [];
    for (let i = 0; i < cjkChars.length - 1; i += 1) {
        const gram = cjkChars.slice(i, i + 2);
        if (gram.length === 2) {
            cjkBigrams.push(gram);
        }
    }
    return Array.from(new Set([...baseTerms, ...cjkBigrams]));
}
function scoreDocument(query, doc) {
    const q = query.trim().toLowerCase();
    const body = `${doc.title} ${doc.content}`.toLowerCase();
    const terms = extractTerms(q);
    let score = 0;
    if (q && body.includes(q)) {
        score += 8;
    }
    for (const term of terms) {
        if (body.includes(term)) {
            score += 2;
        }
    }
    if (doc.type === 'catalog' && /(遊戲|價格|庫存|版本|推薦|商品)/.test(query)) {
        score += 1;
    }
    return score;
}
function retrieveRagContext(state, message, topK = 4) {
    const docs = [...staticKnowledge, ...buildCatalogDocuments(state)];
    const ranked = docs
        .map((doc) => ({ doc, score: scoreDocument(message, doc) }))
        .filter((item) => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    return ranked;
}
