var MessageRole = /* @__PURE__ */ ((MessageRole2) => {
  MessageRole2["System"] = "system";
  MessageRole2["User"] = "user";
  MessageRole2["Assistant"] = "assistant";
  MessageRole2["Tool"] = "tool";
  return MessageRole2;
})(MessageRole || {});
class ProtocolConverter {
  /** OpenAI 消息 → 统一消息 */
  static toOpenAI(messages) {
    return messages.map((m) => ({
      role: m.role,
      content: m.content,
      name: m.name
    }));
  }
  /** 统一消息 → OpenAI 消息 */
  static fromUnified(messages) {
    return messages.map((m) => ({
      role: m.role,
      content: typeof m.content === "string" ? m.content : m.content.map((c) => c.type === "text" ? c.text : "").join("\n"),
      name: m.name
    }));
  }
  /** Anthropic 响应 → 统一响应 */
  static toUnified(response, model) {
    const textContent = response.content.filter((c) => c.type === "text").map((c) => c.text).join("\n");
    return {
      id: response.id,
      object: "chat.completion",
      created: Date.now() / 1e3,
      model,
      choices: [{
        index: 0,
        message: { role: "assistant", content: textContent },
        finish_reason: response.stop_reason === "end_turn" ? "stop" : response.stop_reason
      }],
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 }
    };
  }
}
export {
  MessageRole as M,
  ProtocolConverter as P
};
