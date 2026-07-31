export const customerResetPasswordTemplate = (url: string) => ({
	subject: `Reset Your Password - Lalo Bakery Solutions`,
	html: `
        <div style="max-width: 600px; margin: auto; font-family: sans-serif; border: 1px solid #eee;">
            <div style="background-color: #c9a227; padding: 20px; text-align: center;">
                <img src="https://lalobakerysolutions.com/logo192.png"
                     alt="Lalo Bakery Logo"
                     width="80"
                     style="display: block; margin: 0 auto 10px;">
                <h1 style="color: white; margin: 0; font-size: 20px;">
                    Reset Your Password
                </h1>
            </div>

            <div style="padding: 20px; color: #333;">
                <p>Hello,</p>

                <p>
                    We received a request to reset the password for your
                    <strong>Lalo Bakery Solutions</strong> account.
                </p>

                <p>
                    Click the button below to create a new password.
                </p>

                <div style="text-align: center; margin: 25px 0;">
                    <a href="${url}"
                       style="background: #c9a227; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                        Reset Password
                    </a>
                </div>

                <p>
                    If the button does not work, copy and paste this link into your browser:
                </p>

                <p style="word-break: break-all; color: #c9a227;">
                    ${url}
                </p>

                <p>
                    If you did not request a password reset, you can safely ignore this email.
                    Your password will remain unchanged.
                </p>

                <p style="margin-top: 20px;">
                    Best regards,<br/>
                    <strong>Lalo Bakery Team</strong>
                </p>
            </div>

            <div style="background: #f9f9f9; padding: 15px; text-align: center; color: #777; font-size: 12px;">
                Lalo Bakery Solutions | Quality you can taste.
            </div>
        </div>
    `});

    