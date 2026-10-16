(() => {
    'use strict';

    const gameSpinBottle = document.getElementById('gameSpinBottle');
    const featuredPlayBtn = document.getElementById('featuredPlayBtn');
    const loaderOverlay = document.getElementById('loaderOverlay');
    const loaderBarFill = document.getElementById('loaderBarFill');
    const loaderPercentage = document.getElementById('loaderPercentage');
    const toastAlert = document.getElementById('toastAlert');
    const comingSoonCards = document.querySelectorAll('.game-card.coming-soon');

    let isTransitioning = false;

    // Launch Spin da' Bottle
    const launchGame = () => {
        if (isTransitioning) return;
        isTransitioning = true;

        // Show loading screen
        loaderOverlay.classList.add('show');

        // Progress Animation
        let progress = 0;
        const duration = 2400; // 2.4 seconds
        const stepTime = 30; // ms per update
        const totalSteps = duration / stepTime;
        const progressIncrement = 100 / totalSteps;

        const interval = setInterval(() => {
            progress += progressIncrement;
            if (progress >= 100) {
                progress = 100;
                clearInterval(interval);
                
                // Small buffer to show 100% before redirect
                setTimeout(() => {
                    window.location.href = 'game.html';
                }, 150);
            }

            // Update UI
            loaderBarFill.style.width = `${progress}%`;
            loaderPercentage.textContent = `${Math.floor(progress)}%`;
        }, stepTime);
    };

    if (gameSpinBottle) {
        gameSpinBottle.addEventListener('click', launchGame);
    }
    if (featuredPlayBtn) {
        featuredPlayBtn.addEventListener('click', launchGame);
    }

    // Coming soon games
    comingSoonCards.forEach(card => {
        card.addEventListener('click', () => {
            if (isTransitioning) return;
            showToast();
        });
    });

    let toastTimeout = null;
    function showToast() {
        if (toastTimeout) {
            clearTimeout(toastTimeout);
            toastAlert.classList.remove('show');
        }

        // Force reflow
        void toastAlert.offsetWidth;

        toastAlert.classList.add('show');

        toastTimeout = setTimeout(() => {
            toastAlert.classList.remove('show');
        }, 2000);
    }
})();
