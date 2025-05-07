(function () {
  if (window.__myChatWidgetLoaded) return;
  window.__myChatWidgetLoaded = true;

  // Find the <script> tag that loaded this widget
  const currentScript =
    document.currentScript ||
    [...document.getElementsByTagName("script")].pop();
  const agentId = currentScript.getAttribute("data-agent-id");

  if (!agentId) {
    console.error("Agent ID not provided in widget script tag.");
    return;
  }

  const apiUrl = `http://localhost:4000/api/agents/${agentId}`;
  const iframeId = "my-chatbot-widget";
  const toggleBtnId = "chatbot-toggle-button";

  (async function () {
    try {
      const res = await fetch(apiUrl);
      const agentResp = await res.json();
      const agent = agentResp?.data;

      const btnColor = agent.chatBubbleBtnColor || "#000000";
      const align = agent.alignChatBubbleBtn || "right";
      const welcomeMessage =
        agent.welcomeMessage || "Hi, how can I help you today?";
      const chatIcon = agent.chatIcon || "💬";

      const toggleBtn = document.createElement("button");
      toggleBtn.id = toggleBtnId;
      toggleBtn.innerText = chatIcon;
      Object.assign(toggleBtn.style, {
        position: "fixed",
        bottom: "20px",
        [align]: "20px",
        zIndex: "100000",
        width: "52px",
        height: "52px",
        borderRadius: "50%",
        background: btnColor,
        color: "#fff",
        border: "none",
        cursor: "pointer",
        fontSize: "20px",
        boxShadow: "0 2px 8px rgba(0, 0, 0, 0.3)",
        transition: "transform 0.2s ease-in-out",
      });

      const iframe = document.createElement("iframe");
      iframe.id = iframeId;
      iframe.src = `http://localhost:3000/chatbot/${agentId}`;
      Object.assign(iframe.style, {
        position: "fixed",
        bottom: "90px",
        [align]: "20px",
        width: "450px",
        height: "80vh",
        border: "none",
        borderRadius: "12px",
        boxShadow: "0 0 20px rgba(0,0,0,0.2)",
        zIndex: "99999",
        display: "none",
      });

      document.body.appendChild(toggleBtn);
      document.body.appendChild(iframe);

      toggleBtn.addEventListener("click", () => {
        const isVisible = iframe.style.display === "block";
        iframe.style.display = isVisible ? "none" : "block";
        toggleBtn.innerText = isVisible ? chatIcon : "✖";
      });

      toggleBtn.addEventListener("mouseenter", () => {
        toggleBtn.style.transform = "scale(1.12)";
      });
      toggleBtn.addEventListener("mouseleave", () => {
        toggleBtn.style.transform = "scale(1)";
      });
    } catch (error) {
      console.error("Failed to fetch agent data:", error);
    }
  })();
})();
