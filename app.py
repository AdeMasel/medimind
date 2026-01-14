import streamlit as st  
import google.generativeai as genai  
import os  
  
# Configurazione della pagina  
st.set_page_config(page_title="La mia App AI", page_icon="🤖")  
  
# Recupera la chiave dalla "cassaforte" di Streamlit (Secrets)  
# Se non trova la chiave, mostra un errore gentile  
try:  
    api_key = st.secrets["GOOGLE_API_KEY"]  
    genai.configure(api_key=api_key)  
except Exception:  
    st.error("Manca la chiave API. Configurala nei Secrets di Streamlit.")  
    st.stop()  
  
# --- INCOLLA QUI SOTTO LE TUE ISTRUZIONI DI SISTEMA ---  
ISTRUZIONI_SISTEMA = """  
Sei un assistente utile e preciso.  
(Sostituisci questo testo con le tue istruzioni reali copiate da AI Studio)  
"""  
  
# Configurazione Modello  
model = genai.GenerativeModel(  
    model_name="gemini-1.5-flash",  
    system_instruction=ISTRUZIONI_SISTEMA  
)  
  
# Interfaccia Utente  
st.title("🤖 Assistente AI")  
st.markdown("Scrivi qui sotto la tua richiesta.")  
  
# Inizializza chat  
if "messages" not in st.session_state:  
    st.session_state.messages = []  
  
# Mostra cronologia  
for message in st.session_state.messages:  
    with st.chat_message(message["role"]):  
        st.markdown(message["content"])  
  
# Input e Risposta  
if prompt := st.chat_input("Chiedimi qualcosa..."):  
    st.chat_message("user").markdown(prompt)  
    st.session_state.messages.append({"role": "user", "content": prompt})  
  
    try:  
        history_gemini = [  
            {"role": "user" if m["role"] == "user" else "model", "parts": [m["content"]]}  
            for m in st.session_state.messages  
        ]  
        chat = model.start_chat(history=history_gemini[:-1])  
        response = chat.send_message(prompt)  
  
        with st.chat_message("assistant"):  
            st.markdown(response.text)  
        st.session_state.messages.append({"role": "assistant", "content": response.text})  
    except Exception as e:  
        st.error(f"Errore: {e}")  
