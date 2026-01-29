document.addEventListener('DOMContentLoaded', () => {
    const buttons = document.querySelectorAll('.switcher-btn');
    const schemes = document.querySelectorAll('.accounting-app');

    buttons.forEach(button => {
        button.addEventListener('click', () => {
            const theme = button.getAttribute('data-theme');

            // 切换按钮激活状态
            buttons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');

            // 切换主题显示
            schemes.forEach(scheme => {
                scheme.classList.remove('active-scheme');
                if (scheme.classList.contains(`scheme-${theme}`)) {
                    scheme.classList.add('active-scheme');
                }
            });
        });
    });
});
