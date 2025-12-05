function showError(message: string): void
{
    alert(message);
}

export class inputParserClass {

	public parseTournament(tournamentName: string, nbPlayers: number ) {
	
		if (!tournamentName) {
			showError("Lütfen bir turnuva adı girin")
			return false;
		}
	
		else if (tournamentName.length < 3)	{
			showError("Turnuva adı en az 3 karakter olmalıdır");
			return false;
		}
	
		else if (!/^[a-zA-Z0-9_-]+$/.test(tournamentName)) {
			showError("Turnuva adında en az bir geçersiz karakter var");
			return false;
		}
	
		if (nbPlayers % 2) {
			showError("Turnuva çift sayıda oyuncu içermelidir");
			return false;
		}

		if (nbPlayers < 2 || nbPlayers > 64) {
			showError("Turnuva 2 ile 64 oyuncu arasında olmalıdır");
			return false;
		}
		return true;
	}

	public parsePlayerName(name: string): boolean {

		if (!name)
		{
			showError("Lütfen adınızı girin")
			return false;
		}
		else if (name.length < 3)
		{
			showError("Ad en az 3 karakter olmalıdır");
			return false;
		}
		else if (!/^[a-zA-Z0-9_-]+$/.test(name))
		{
			showError("Adda en az bir geçersiz karakter var");
			return false;
		}
		return true;
	}
};