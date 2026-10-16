(() => {
    'use strict';

    const runSimBtn = document.getElementById('runSimBtn');
    const coinWidget = document.getElementById('coinWidget');
    const entropyVal = document.getElementById('entropyVal');
    const confidenceVal = document.getElementById('confidenceVal');
    const predictedOutcome = document.getElementById('predictedOutcome');

    let isSimulating = false;
    let flipCount = 0;

    runSimBtn.addEventListener('click', () => {
        if (isSimulating) return;
        isSimulating = true;

        // Button state
        runSimBtn.textContent = 'COMPUTING ENTROPY VECTOR...';
        runSimBtn.disabled = true;

        // Visual text animation loop
        predictedOutcome.textContent = 'RESOLVING QUANTUM STATE...';
        predictedOutcome.style.color = 'var(--muted)';

        let tickCount = 0;
        const tickInterval = setInterval(() => {
            entropyVal.textContent = (Math.random() * 0.4 + 0.6).toFixed(3);
            confidenceVal.textContent = (50.1 + Math.random() * 4).toFixed(1) + '%';
            tickCount++;
            if (tickCount >= 15) {
                clearInterval(tickInterval);
            }
        }, 100);

        // Spin animation
        flipCount += 3; // Add full rotations
        const chosenOutcome = Math.random() > 0.5 ? 'UP' : 'DOWN';
        const finalRotationY = flipCount * 360 + (chosenOutcome === 'DOWN' ? 180 : 0);
        
        // Add random slight X rotation to feel 3D organic
        const randomRotationX = (Math.random() * 20 - 10) + 15;

        // Apply 3D transform rotation Y
        coinWidget.style.transform = `rotateX(${randomRotationX}deg) rotateY(${finalRotationY}deg)`;

        // Resolve outcome after animation completes (1.2 seconds)
        setTimeout(() => {
            isSimulating = false;
            runSimBtn.textContent = 'INITIATE ENTROPY FLIP';
            runSimBtn.disabled = false;

            // Update stats
            entropyVal.textContent = (Math.random() * 0.1 + 0.05).toFixed(3); // Low entropy on resolution
            confidenceVal.textContent = (51.5 + Math.random() * 3).toFixed(1) + '%';
            
            // Print final prediction
            predictedOutcome.textContent = chosenOutcome;
            if (chosenOutcome === 'UP') {
                predictedOutcome.style.color = 'var(--green)';
            } else {
                predictedOutcome.style.color = 'var(--cyan)';
            }
        }, 1250);
    });
})();
