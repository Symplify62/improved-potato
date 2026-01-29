// Supabase 配置
const SUPABASE_URL = 'https://zfzoxgjufrnqajcdqvkx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpmem94Z2p1ZnJucWFqY2Rxdmt4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODAzNzEsImV4cCI6MjA4NTI1NjM3MX0.ldDu0QNYm0SrQcJUeDax9zHSTRgTBBQI_ORzL3FBN0E';

// 等待 Supabase SDK 加载完成后初始化客户端
function initSupabase() {
    if (window.supabase && window.supabase.createClient) {
        window.supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        console.log('Supabase 客户端初始化成功');
        return true;
    }
    return false;
}

// 立即尝试初始化
if (!initSupabase()) {
    // 如果失败，等待 DOM 加载后重试
    document.addEventListener('DOMContentLoaded', initSupabase);
}
