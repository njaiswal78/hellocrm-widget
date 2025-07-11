(function () {
  function getAccountIdFromScript() {
    const scripts = document.getElementsByTagName("script");

    for (let script of scripts) {
      const src = script.getAttribute("src");
      if (src && src.includes("tracker.js")) {
        try {
          const url = new URL(src, window.location.href);
          return url.searchParams.get("accountId");
        } catch (err) {
          console.error("Invalid script src URL:", src);
        }
      }
    }

    return null;
  }

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

  const accountId = getAccountIdFromScript();
  const queue = window.hellocrm.q || [];
  const state = {
    user: getUserFromCookie(),
    initialized: false,
  };

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

  function sendEvent(event, data = {}) {
    const user = state.user || getUserFromCookie();
    if (!user && !user?.email) return;

    const pageData = {
      url: data.url || window.location.href,
      path: data.path || window.location.pathname,
      title: data.title || document.title,
      referrer: data.referrer || document.referrer || "direct",
      load_time: data.load_time || null,
    };

    const payload = {
      event,
      ...data,
      accountId,
      _id: user?._id || null,
      teamId: user?.teamId || null,
      userId: user?.userId || null,
      email: user?.email || null,
      name: user?.name || null,
      pageData,
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
    // Security: Optional origin validation
    // if (event.origin !== "https://your-trusted-site.com") return;

    const { type, user, meeting } = event.data || {};

    // --- Identify contact
    if (type === "HELLOCRM_IDENTIFY" && user) {
      if (window.hellocrm) {
        window.hellocrm("identify", user);
        window.hellocrm("track", "contact_form_identified");
      } else {
        window.hellocrm = window.hellocrm || [];
        window.hellocrm.push(["identify", user]);
      }
    }

    // --- Track meeting booked
    if (type === "HELLOCRM_MEETING_BOOKED" && meeting) {
      const accountId = getAccountIdFromScript();

      const payload = {
        ...meeting,
        accountId,
      };

      fetch("https://api.hellocrm.ai/api/meetings/logMeetingBookedActivity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
        .then((res) => res.json())
        .then((data) => {
          if (data?.success && data?.contact) {
            const contact = data.contact;

            const user = {
              _id: contact._id,
              teamId: contact.teamId,
              userId: contact.userId,
              email: contact.email,
              name: contact.name,
            };

            // Update both cookie and local state
            document.cookie = `hellocrm_tracked_user=${btoa(
              JSON.stringify(user)
            )}; path=/; max-age=31536000`;

            state.user = user;

            window.parent.postMessage(
              { type: "HELLOCRM_MEETING_BOOKED_ACK" },
              "*"
            );
          } else {
            console.warn("Failed to log meeting activity");
          }
        })
        .catch((err) => {
          console.error("Tracker.js: Error logging meeting", err.message);
        });
    }
  });
})();
