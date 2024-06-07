export class NavBar extends HTMLElement {

    constructor() {
        super();
        this.innerHTML = `
            <nav>
                <ul>
                    <li><a href="labeling.html">Labeling</a></li>
                    <li><a href="">Clustering</a></li>
                    <li><a href="models.html">Models</a></li>
                    <li><a href="inference.html">Inference</a></li>
                    <li><label id="connection_status">Not logged in.</label></li>
                    <li><button id="credentials-button" class="login-button">Server Credentials</button></li>
                </ul>

            </nav>
        `;
        this.credentials_button = this.querySelector('#credentials-button');

    }
}

customElements.define('my-navbar', NavBar);

export class ServerLoginPane extends HTMLDialogElement {
    constructor() {
        self = super();
        this.server = null;

        this.innerHTML = `
            <label>Server:
                <input id="server-field"></input>
            </label>
            <label>Username:
                <input id="username-field"></input>
            </label>
            <label>Password:
                <input id="password-field"></input>
            </label>
            <div id="button-area">
                <button id="connect">Connect</button>
                <button id="cancel" class='cancel'>Cancel</button>
            </div>

            <style>
                dialog[is="server-login-pane"]  {
                    margin: 5% auto 15% auto;
                    width: 60%;
                    padding: 16px;

                    #button-area {
                        text-align: center;
                        display: block;
                    }
                    input {
                        width: 100%;
                        padding: 12px 20px;
                        margin: 8px 8px;
                    }
                    button {
                        margin: 10px 10px;
                        padding: 14px 20px;
                        font-size: 16px;
                        font-weight: bold;
                    }
                }
            </style>
        `;

        this.server_field = this.querySelector('#server-field');
        this.username_field = this.querySelector('#username-field');
        this.password_field = this.querySelector('#password-field');
        this.connect_button = this.querySelector('#connect');
        this.cancel_button = this.querySelector('#cancel');

        this.connect_button.onclick = (event) => {
            this.saveCredentials();
            this.close();
        };

        this.cancel_button.onclick = (event) => {
            this.close();

        };

    }


    saveCredentials() {
        let server_url = this.server_field.value;
        let db = "ai/labels";
        let username = this.username_field.value;
        let password = this.password_field.value;

        sessionStorage.setItem('server_url', server_url);
        sessionStorage.setItem('db', db);
        sessionStorage.setItem('username', username);
        sessionStorage.setItem('password', password);
        if (this.server) {
            this.server.set_credentials(server_url, db, username, password);
        }
        else {
            console.warn("No server attached to login pane, not logging in");
        }
    }
    loadCredentials() {
        let server_url = sessionStorage.getItem('server_url');
        let db = sessionStorage.getItem('db');
        let username = sessionStorage.getItem('username');
        let password = sessionStorage.getItem('password');
        this.server_field.value = server_url;
        this.username_field.value = username;
        this.password_field.value = password;
        this.server.set_credentials(server_url, db, username, password);
    }
}
customElements.define('server-login-pane', ServerLoginPane, {extends: "dialog"});
