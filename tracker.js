(function () {
  function getUserFromCookie() {
    const match = document.cookie.match(
      /(?:^|;\s*)hellocrm_tracked_user=([^;]*)/
    );
    if (!match) return null;

    try {
      return JSON.parse(atob(match[1]));
    } catch (e) {
      return null;
    }
  }

  const methods = {
    identify(user) {
      state.user = user;
      document.cookie = `hellocrm_tracked_user=${btoa(
        JSON.stringify(user)
      )}; path=/; max-age=31536000`;
    },
    track(event, data) {
      sendEvent(event, data);
    },
  };

  const queue = window.hellocrm.q || [];
  const state = {
    user: getUserFromCookie(),
    initialized: false,
  };

  function sendEvent(event, data = {}) {
    const user = state.user || getUserFromCookie();
    if (!user && !user?.email) return;

    const payload = {
      event,
      ...data,
      email: user?.email || null,
      name: user?.name || null,
      timestamp: new Date().toISOString(),
      url: window.location.href,
      referrer: document.referrer,
    };

    fetch("https://api.hellocrm.ai/api/activities/track", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    }).catch((e) => console.warn("HelloCRM tracking failed", e));
  }

  // Process any queued calls
  queue.forEach(([method, ...args]) => {
    if (methods[method]) methods[method](...args);
  });

  // Replace placeholder with real object
  window.hellocrm = function (method, ...args) {
    if (methods[method]) methods[method](...args);
  };

  // Auto track clicks
  document.addEventListener("click", (e) => {
    const target = e.target.closest("a, button");

    if (!target) return;

    const href = target.getAttribute("href");
    const downloadExtensions =
      /\.(pdf|zip|docx?|xlsx?|csv|mp3|mp4|wav|avi|mov|jpg|jpeg|png|gif|webp)$/i;

    sendEvent("click", {
      tag: target.tagName,
      text: target.innerText?.trim().slice(0, 100),
      href: target.href || null,
      id: target.id || null,
      class: target.className || null,
    });

    // Track downloads for common file types
    if (href && downloadExtensions.test(href)) {
      sendEvent("download", {
        href,
        fileType: href.split(".").pop(),
        fileName: href.split("/").pop(),
      });
    }
  });

  // Auto track scroll (basic)
  let scrollTracked = false;
  window.addEventListener("scroll", () => {
    if (!scrollTracked && window.scrollY > 200) {
      scrollTracked = true;
      sendEvent("scroll", { scrollY: window.scrollY });
    }
  });

  // Add to your tracker.js
  window.addEventListener("message", (event) => {
    // Security: Verify the message is from your trusted iframe domain
    // if (event.origin !== "https://your-react-app-domain.com") return;

    if (event.data.type === "HELLOCRM_IDENTIFY") {
      if (window.hellocrm) {
        window.hellocrm("identify", event.data.user);
        // Optional: Track a custom event
        window.hellocrm("track", "contact_form_identified");
      } else {
        // Queue the call if hellocrm isn't loaded yet
        window.hellocrm = window.hellocrm || [];
        window.hellocrm.push(["identify", event.data.user]);
      }
    }
  });
})();
