(function () {
  if (window.__myLiveChatWidgetLoaded) return;
  window.__myLiveChatWidgetLoaded = true;

  // Find the <scrip> tag that loaded this widget
  const currentScript =
    document.currentScript ||
    [...document.getElementsByTagName("script")].pop();
  const chatToken = currentScript.getAttribute("data-chat-token");

  if (!chatToken) {
    console.error("Chat Token not provided in widget script tag.");
    return;
  }

  const apiUrl = `http://localhost:4000/api/livechat/settings/${chatToken}`;
  const iframeId = "live-chatbot-widget";
  const toggleBtnId = "live-chatbot-toggle-button";

  (async function () {
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error("Failed to fetch settings");
      const settingsResp = await res.json();
      const settings = settingsResp?.data;

      // Validate and process settings
      const getValidColor = (color, defaultColor) => {
        if (!color) return defaultColor;
        color = color.trim();
        return color.startsWith("#") ? color : `#${color}`;
      };

      const btnColor = getValidColor(settings.chatBubbleBtnColor, "#000000");
      const align =
        settings.alignChatBubbleBtn?.trim()?.toLowerCase() === "left"
          ? "left"
          : "right";
      const welcomeMessage =
        settings.welcomeMessage || "Hi, how can I help you today?";
      const chatIcon = settings.chatIcon || "💬";

      // Create the toggle button and iframe elements
      const toggleBtn = document.createElement("button");
      toggleBtn.id = toggleBtnId;
      toggleBtn.innerHTML = chatIcon;

      const iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.src = `http://localhost:3000/live-chatbot/${chatToken}`;
      iframe.setAttribute("aria-label", "Live chat widget");

      // Append the elements to the document body
      document.body.appendChild(toggleBtn);
      document.body.appendChild(iframe);

      // Apply styles in the next animation frame
      requestAnimationFrame(() => {
        // Toggle button styles
        toggleBtn.style.cssText = `
              position: fixed;
              bottom: 20px;
              ${align}: 20px;
              z-index: 100000;
              width: 52px;
              height: 52px;
              border-radius: 50%;
              background-color: ${btnColor};
              color: #ffffff;
              border: none;
              cursor: pointer;
              font-size: 20px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
              transition: transform 0.2s ease-in-out;
            `;

        // Iframe styles
        iframe.style.cssText = `
              position: fixed;
              bottom: 90px;
              ${align}: 20px;
              width: 450px;
              max-width: 90vw;
              height: 80vh;
              max-height: 600px;
              border: none;
              border-radius: 12px;
              box-shadow: 0 0 20px rgba(0, 0, 0, 0.2);
              z-index: 99999;
              display: none;
              background: white;
            `;
      });

      // Interaction handlers
      toggleBtn.addEventListener("click", () => {
        const isVisible = iframe.style.display === "block";
        iframe.style.display = isVisible ? "none" : "block";
        toggleBtn.innerHTML = isVisible ? chatIcon : "✖";
      });

      toggleBtn.addEventListener("mouseenter", () => {
        toggleBtn.style.transform = "scale(1.12)";
      });

      toggleBtn.addEventListener("mouseleave", () => {
        toggleBtn.style.transform = "scale(1)";
      });

      // Post welcome message to iframe after loading
      iframe.addEventListener("load", () => {
        iframe.contentWindow.postMessage(
          {
            type: "INIT",
            welcomeMessage,
          },
          "*"
        );
      });
    } catch (error) {
      console.error("Live chat widget error:", error);
      // Fallback UI in case of failure
      const errorMsg = document.createElement("div");
      errorMsg.textContent = "Chat is currently unavailable";
      errorMsg.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: #ffebee;
            padding: 10px 15px;
            border-radius: 4px;
            z-index: 100000;
          `;
      document.body.appendChild(errorMsg);
    }
  })();
})();
