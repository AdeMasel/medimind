declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

const waitForGoogleScripts = () => {
  return new Promise<void>((resolve, reject) => {
    let attempts = 0;
    const maxAttempts = 50; // 5 secondi max
    const check = () => {
      attempts++;
      if (window.gapi && window.google?.accounts?.oauth2 && window.google?.picker) {
        resolve();
      } else if (attempts >= maxAttempts) {
        reject(new Error("Timeout caricamento script Google. Verifica la connessione o i blocchi script."));
      } else {
        setTimeout(check, 100);
      }
    };
    check();
  });
};

export class GoogleDriveService {
  private tokenClient: any;
  private accessToken: string | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;

  private get API_KEY() { return process.env.API_KEY; }
  private get CLIENT_ID() { return process.env.GOOGLE_CLIENT_ID || ''; }
  private get APP_ID() { return process.env.GOOGLE_APP_ID || ''; }

  get isConfigured(): boolean {
    return !!(this.CLIENT_ID && this.APP_ID && this.API_KEY);
  }

  async init() {
    if (this.isInitialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      if (!this.isConfigured) {
        console.warn("Google Drive Integration: Parametri mancanti (CLIENT_ID o APP_ID).");
        return;
      }

      try {
        await waitForGoogleScripts();

        // Caricamento librerie GAPI necessarie
        await new Promise<void>((resolve, reject) => {
          window.gapi.load('client:picker', {
            callback: resolve,
            onerror: () => reject(new Error("Errore caricamento GAPI Picker")),
            timeout: 5000,
            ontimeout: () => reject(new Error("Timeout caricamento GAPI Picker"))
          });
        });
        
        // Inizializzazione Token Client per OAuth2
        this.tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: this.CLIENT_ID,
          scope: 'https://www.googleapis.com/auth/drive.readonly https://www.googleapis.com/auth/drive.file',
          callback: (response: any) => {
            if (response.error !== undefined) {
              console.error("Auth Error:", response);
            }
            this.accessToken = response.access_token;
          },
        });

        this.isInitialized = true;
      } catch (error) {
        console.error("Failed to initialize Google Drive Service:", error);
        this.initPromise = null; // Permetti riprova
        throw error;
      }
    })();

    return this.initPromise;
  }

  private async getAccessToken(): Promise<string> {
    if (!this.isInitialized) {
      await this.init();
    }
    
    if (!this.isConfigured) {
      throw new Error("Integrazione Google Drive non configurata. Imposta CLIENT_ID e APP_ID.");
    }

    if (!this.tokenClient) {
      throw new Error("Inizializzazione Google Drive fallita. Ricarica la pagina o controlla le estensioni del browser (adblock).");
    }
    
    return new Promise((resolve, reject) => {
      try {
        this.tokenClient.callback = (resp: any) => {
          if (resp.error !== undefined) {
            reject(new Error("Errore autorizzazione Google: " + resp.error));
          }
          this.accessToken = resp.access_token;
          resolve(resp.access_token);
        };
        // Chiede il token senza mostrare il prompt se già concesso, altrimenti apre popup
        this.tokenClient.requestAccessToken({ prompt: '' });
      } catch (err) {
        reject(new Error("Impossibile richiedere il token di accesso: " + (err as Error).message));
      }
    });
  }

  async uploadFile(blob: Blob, fileName: string): Promise<{id: string, webViewLink: string}> {
    const token = await this.getAccessToken();

    const metadata = {
      name: fileName,
      mimeType: blob.type,
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', blob);

    const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: new Headers({ 'Authorization': 'Bearer ' + token }),
      body: form,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Upload Drive Fallito (${response.status}): ${errorData.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  async openPicker(): Promise<File[]> {
    if (!this.isConfigured) throw new Error("Google Drive non configurato.");
    
    const token = await this.getAccessToken();

    return new Promise((resolve, reject) => {
      try {
        const view = new window.google.picker.View(window.google.picker.ViewId.DOCS);
        view.setMimeTypes("application/pdf,image/png,image/jpeg,image/jpg");

        const picker = new window.google.picker.PickerBuilder()
          .enableFeature(window.google.picker.Feature.NAV_HIDDEN)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setAppId(this.APP_ID)
          .setOAuthToken(token)
          .addView(view)
          .addView(new window.google.picker.DocsUploadView())
          .setDeveloperKey(this.API_KEY)
          .setCallback(async (data: any) => {
            if (data.action === window.google.picker.Action.PICKED) {
              try {
                const files = await Promise.all(
                  data.docs.map((doc: any) => this.downloadFile(doc.id, doc.name, doc.mimeType, token))
                );
                resolve(files);
              } catch (e) {
                reject(e);
              }
            } else if (data.action === window.google.picker.Action.CANCEL) {
              resolve([]);
            }
          })
          .build();
        
        picker.setVisible(true);
      } catch (err) {
        reject(new Error("Errore nell'apertura del selettore Google Drive: " + (err as Error).message));
      }
    });
  }

  private async downloadFile(fileId: string, fileName: string, mimeType: string, token: string): Promise<File> {
    const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (!response.ok) throw new Error(`Download file fallito: ${response.statusText}`);
    const blob = await response.blob();
    return new File([blob], fileName, { type: mimeType });
  }
}

export const googleDriveService = new GoogleDriveService();