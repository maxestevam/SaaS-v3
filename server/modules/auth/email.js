export async function sendResetEmail(user, rawToken, appUrl) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error("O envio de e-mail ainda não foi configurado.");
  }

  const resetUrl = `${appUrl}/reset-password?token=${encodeURIComponent(rawToken)}`;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "Loja Descomplicada <onboarding@resend.dev>",
      to: [user.email],
      subject: "Redefina a sua senha da Loja Descomplicada",
      html: `<main style="font-family:Arial,sans-serif;color:#18181b;line-height:1.5"><h1 style="color:#ff32b2">Uma nova senha para sua operação</h1><p>Olá, ${escapeHtml(user.name)}.</p><p>Este link é válido por 30 minutos.</p><p><a href="${resetUrl}" style="display:inline-block;background:linear-gradient(45deg,#ff32b2,#fd7a00);color:#ffffff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:bold">Criar nova senha</a></p><p>Se não foi você, ignore esta mensagem.</p></main>`,
    }),
  });

  if (!response.ok) {
    throw new Error("Não foi possível enviar o e-mail de recuperação.");
  }
}

function escapeHtml(value) {
  return String(value || "").replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[character]);
}
