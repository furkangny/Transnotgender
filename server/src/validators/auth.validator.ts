import { BadRequest, UserError, errClient } from "@app/shared/errors.js"
import { getDatabase } from "../db/databaseSingleton.js"
import { verifyPassword } from "../utils/passwords.js";

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).+$/;
const LOGIN_PATTERN = /^[a-zA-Z0-9_!@#$%&*=-]+$/;
const ALIAS_PATTERN = /^[a-zA-Z0-9_ -]+$/;




const db = getDatabase()

export function validateRegistering(requestBody: any) //*purely simple parsing (no duplicates check and so on)
{
	const {login, password, passwordValidation, alias } = requestBody;

	console.log(`[login] : ${login}\n
				[password] : ${password}\n
				[passwordValidation] : ${[passwordValidation]}\n
				[alias] : ${alias}`);

	if (typeof login !== 'string')
		throw new BadRequest('Lütfen kullanıcı adınızı girin');
	if (login.length < 3)
		throw new BadRequest('Kullanıcı adı en az 3 karakterden oluşmalıdır.')
	else if (login.length > 24)
		throw new BadRequest('Kullanıcı adı 24 karakterden uzun olmamalıdır')
	if (!LOGIN_PATTERN.test(login))
		throw new BadRequest('Kullanıcı adında geçersiz karakter var')
	
	if (typeof alias !== 'string')
		throw new BadRequest('Lütfen takma adınızı girin');
	if (alias.length < 3)
		throw new BadRequest('Takma ad en az 3 karakterden oluşmalıdır.')
	else if (alias.length > 24)
		throw new BadRequest('Takma ad 24 karakterden uzun olmamalıdır')
	if (!ALIAS_PATTERN.test(alias))
		throw new BadRequest('Takma adda geçersiz karakter var')
	if (login === alias)
		throw new BadRequest('Kullanıcı adı ve takma ad farklı olmalıdır')

	if (typeof password !== 'string')
		throw new BadRequest('Lütfen bir şifre girin');
	if (password.length < 6)
		throw new BadRequest('Şifre en az 6 karakterden oluşmalıdır.')
	if (password.length > 32)
		throw new BadRequest('Şifre 32 karakterden kısa olmalıdır')
	if (!PASSWORD_PATTERN.test(password))
		throw new BadRequest('Şifre en az bir büyük harf, bir küçük harf, bir rakam ve bir özel karakter içermelidir')

	if (password !== passwordValidation)
		throw new BadRequest('Şifreler eşleşmiyor');
}

export function checkForDuplicatesAtRegistering(login: string, alias: string)
{
	if (db.getUserByLogin(login))
		throw new UserError('Bu kullanıcı adı zaten mevcut', errClient.DUPLICATE_LOGIN, 409);

	if (db.getUserByAlias(alias))
		throw new UserError('Bu takma ad zaten mevcut', errClient.DUPLICATE_NAME, 409);

}


export function validateLoggingIn(requestBody: any)
{
	const { login, password } = requestBody;
	
	console.log(`[login] : ${login}\n[password] : ${password}`);
	
	if (!login)
		throw new BadRequest('Lütfen kullanıcı adınızı girin');
	
	if (!password)
		throw new BadRequest('Lütfen şifrenizi girin');

	const user = db.getUserByLogin(login);
	if (!user)
		throw new BadRequest('Kullanıcı adı ve/veya şifre hatalı', 404);
	
	console.log(`Found user: login=${user.login}, alias=${user.alias}, id=${user.id}`);
	
	const hashedPassword = user.password;
	if (verifyPassword(password, hashedPassword!) === false)
		throw new BadRequest('Kullanıcı adı ve/veya şifre hatalı', 404);
}

const EXPECTED_CLIENT_ID = "782178545544-31i17kv4fli13eqj7o0l4dclqnbb3hql.apps.googleusercontent.com";
export async function validateGoogleToken(credential: string | undefined)
{
	if (!credential)
		throw new BadRequest('Token eksik', 400);


	const googleResponse = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );

    if (!googleResponse.ok)
    {
        console.error('[AUTH] ❌ Token rejeté par Google');
        throw new BadRequest('Geçersiz token', 401);
    }

    const payload = await googleResponse.json();

    console.log('[AUTH] ✅ Token vérifié');

    if (payload.aud !== EXPECTED_CLIENT_ID)
    {
        console.error('[AUTH] ❌ Token pas pour cette application');
        throw new BadRequest('Geçersiz token', 401);
    }

    if (!payload.email)
        throw new BadRequest('E-posta eksik', 400);

    const name = payload.name || payload.email.split('@')[0] || 'User';

    return { email: payload.email, name: name, picture: payload.picture };
}