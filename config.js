// config.js
module.exports = {
  email: {
    host: 'smtp.gmail.com',  // SMTP-Server
    port: 587,                // SMTP-Port
    secure: false,            // TLS-Verschlüsselung
    user: process.env.EMAIL_USER || 'lukassaraci@gmail.com',  // Wird durch env-Variable überschrieben
    password: process.env.EMAIL_PASS || 'dlei lqcu pdqm zubz',  // Wird durch env-Variable überschrieben
    sender: process.env.EMAIL_USER || 'lukassaraci@gmail.com', // Absender-Adresse
  },
  openai: {
      apiKey: process.env.OPENAI_API_KEY
  }
};