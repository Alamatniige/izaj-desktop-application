const animateFlyToTarget = (
  el: HTMLElement,
  start: { x: number; y: number },
  end: { x: number; y: number },
  durationMs = 1200,
  onDone?: () => void,
) => {
  const startTime = performance.now();
  const control = { x: (start.x + end.x) / 2, y: Math.min(start.y, end.y) - 180 };

  // cubic ease-in-out
  const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  let lastTrailTime = 0;

  const createTrail = (x: number, y: number) => {
    const ghost = el.cloneNode(true) as HTMLElement;
    ghost.style.transition = 'opacity 300ms ease, transform 300ms ease';
    ghost.style.pointerEvents = 'none';
    ghost.style.left = `${x - ghost.offsetWidth / 2}px`;
    ghost.style.top = `${y - ghost.offsetHeight / 2}px`;
    ghost.style.opacity = '0.6';
    document.body.appendChild(ghost);
    // fade and shrink
    requestAnimationFrame(() => {
      ghost.style.opacity = '0';
      ghost.style.transform = 'scale(0.7)';
    });
    setTimeout(() => {
      if (ghost.parentNode) ghost.parentNode.removeChild(ghost);
    }, 320);
  };

  const step = (now: number) => {
    const rawT = Math.min(1, (now - startTime) / durationMs);
    const t = easeInOutCubic(rawT);
    const oneMinusT = 1 - t;
    const x = oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x;
    const y = oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y;
    el.style.left = `${x - el.offsetWidth / 2}px`;
    el.style.top = `${y - el.offsetHeight / 2}px`;

    // scale and fade
    const scale = 1 - 0.5 * t;
    const opacity = 1 - 0.75 * t;
    el.style.transform = `scale(${scale})`;
    el.style.opacity = `${opacity}`;

    // trail every ~40ms
    if (now - lastTrailTime > 40 && rawT < 0.98) {
      lastTrailTime = now;
      createTrail(x, y);
    }

    if (rawT < 1) requestAnimationFrame(step);
    else if (onDone) onDone();
  };

  // initial pop for visibility
  el.style.transform = 'scale(1.15)';
  setTimeout(() => {
    requestAnimationFrame(step);
  }, 60);
};

export const createFlyingCartAnimation = (
  buttonElement: HTMLElement,
  cartIconElement: HTMLElement,
  onComplete?: () => void
) => {
  const flyingIcon = document.createElement('div');
  flyingIcon.innerHTML = `
    <div style="width:40px;height:40px;border-radius:9999px;background:white;display:flex;align-items:center;justify-content:center;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#111827" xmlns="http://www.w3.org/2000/svg">
        <path d="M7 18C5.9 18 5.01 18.9 5.01 20S5.9 22 7 22 9 21.1 9 20 8.1 18 7 18ZM1 2V4H3L6.6 11.59L5.24 14.04C5.09 14.32 5 14.65 5 15C5 16.1 5.9 17 7 17H19V15H7.42C7.28 15 7.17 14.89 7.17 14.75L7.2 14.63L8.1 13H15.55C16.3 13 16.96 12.58 17.3 11.97L20.88 5H5.21L4.27 3H1V2ZM17 18C15.9 18 15.01 18.9 15.01 20S15.9 22 17 22 19 21.1 19 20 18.1 18 17 18Z"/>
      </svg>
    </div>
  `;
  flyingIcon.style.position = 'fixed';
  flyingIcon.style.zIndex = '2147483647';
  flyingIcon.style.pointerEvents = 'none';
  flyingIcon.style.width = '40px';
  flyingIcon.style.height = '40px';
  flyingIcon.style.opacity = '1';
  flyingIcon.style.transform = 'scale(1)';
  flyingIcon.style.filter = 'drop-shadow(0 10px 18px rgba(0,0,0,0.35))';

  const buttonRect = buttonElement.getBoundingClientRect();
  const cartRect = cartIconElement.getBoundingClientRect();
  // Start from the bottom-center of the button
  const start = { x: buttonRect.left + buttonRect.width / 2, y: buttonRect.bottom };
  const end = { x: cartRect.left + cartRect.width / 2, y: cartRect.top + cartRect.height / 2 };

  flyingIcon.style.left = `${start.x - 20}px`;
  flyingIcon.style.top = `${start.y - 20}px`;
  document.body.appendChild(flyingIcon);

  animateFlyToTarget(flyingIcon, start, end, 1200, () => {
    document.body.removeChild(flyingIcon);
    if (onComplete) onComplete();
  });

  cartIconElement.style.transform = 'scale(1.2)';
  cartIconElement.style.transition = 'transform 0.2s ease';
  setTimeout(() => { cartIconElement.style.transform = 'scale(1)'; }, 220);
};

export const addToCartWithAnimation = async (
  buttonElement: HTMLElement,
  cartIconElement: HTMLElement,
  addToCartFunction: () => void | Promise<void>,
  onComplete?: () => void
) => {
  // Trigger the add to cart function
  await addToCartFunction();
  
  // Start the animation
  createFlyingCartAnimation(buttonElement, cartIconElement, onComplete);
};

export const createFlyingFavoriteAnimation = (
  buttonElement: Element,
  heartIconElement: HTMLElement,
  onComplete?: () => void
) => {
  const flyingIcon = document.createElement('div');
  flyingIcon.innerHTML = `
    <div style="width:40px;height:40px;border-radius:9999px;background:white;display:flex;align-items:center;justify-content:center;">
      <svg width="26" height="26" viewBox="0 0 24 24" fill="#ef4444" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    </div>
  `;
  flyingIcon.style.position = 'fixed';
  flyingIcon.style.zIndex = '2147483647';
  flyingIcon.style.pointerEvents = 'none';
  flyingIcon.style.width = '40px';
  flyingIcon.style.height = '40px';
  flyingIcon.style.opacity = '1';
  flyingIcon.style.transform = 'scale(1)';
  flyingIcon.style.filter = 'drop-shadow(0 10px 18px rgba(239,68,68,0.35))';

  const buttonRect = buttonElement.getBoundingClientRect();
  const heartRect = heartIconElement.getBoundingClientRect();
  const start = { x: buttonRect.left + buttonRect.width / 2, y: buttonRect.top + buttonRect.height / 2 };
  const end = { x: heartRect.left + heartRect.width / 2, y: heartRect.top + heartRect.height / 2 };

  flyingIcon.style.left = `${start.x - 20}px`;
  flyingIcon.style.top = `${start.y - 20}px`;
  document.body.appendChild(flyingIcon);

  animateFlyToTarget(flyingIcon, start, end, 1200, () => {
    document.body.removeChild(flyingIcon);
    if (onComplete) onComplete();
  });

  heartIconElement.style.transform = 'scale(1.2)';
  heartIconElement.style.transition = 'transform 0.2s ease';
  setTimeout(() => { heartIconElement.style.transform = 'scale(1)'; }, 220);
};

export const addToFavoritesWithAnimation = async (
  buttonElement: Element,
  heartIconElement: HTMLElement,
  toggleFavoriteFn: () => void | Promise<void>,
  onComplete?: () => void
) => {
  await toggleFavoriteFn();
  createFlyingFavoriteAnimation(buttonElement, heartIconElement, onComplete);
};