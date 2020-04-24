import * as RED from "node-red";
import { Red } from "node-red";
import { NoderedUtil } from "./NoderedUtil";
const { GoogleAuth, OAuth2Client } = require('google-auth-library');
var fs = require("fs");
// const request = require('request');
var request = require("request");

function GetGoogleAuthClient(config: Igoogleauth_credentials): any {
    var result = {
        auth: null,
        Client: null
    }
    if (config != null) {
        if (typeof config.serviceaccount === "string" && !NoderedUtil.IsNullEmpty(config.serviceaccount)) {
            config.serviceaccount = JSON.parse(config.serviceaccount);
        }
        if (!NoderedUtil.IsNullEmpty(config.serviceaccount)) {
            result.auth = new GoogleAuth({
                scopes: config.scopes.split(",").join(" "),
                credentials: config.serviceaccount
            });
        }
        if (!NoderedUtil.IsNullEmpty(config.clientid) || !NoderedUtil.IsNullEmpty(config.clientsecret) || !NoderedUtil.IsNullEmpty(config.redirecturi)) {
            result.Client = new OAuth2Client(
                config.clientid,
                config.clientsecret,
                config.redirecturi
            );
            if (!NoderedUtil.IsNullEmpty(config.tokens)) {
                result.Client.setCredentials(JSON.parse(config.tokens));
            }
        }
    }
    return result;
}

export interface Igoogleauth_credentials {
    name: string;
    clientid: string;
    clientsecret: string;
    redirecturi: string;
    scopes: string;
    code: string;
    tokens: string;
    serviceaccount: string;
    authtype: string;
    apikey: string;
}
export class googleauth_credentials {
    public node: Red = null;
    public name: string = "";
    public clientid: string = "";
    public clientsecret: string = "";
    public redirecturi: string = "";
    public scopes: string = "";
    public code: string = "";
    public tokens: string = "";
    public serviceaccount: string = "";
    public apikey: string = "";
    public authtype: string = "";
    constructor(public config: Igoogleauth_credentials) {
        RED.nodes.createNode(this, config);
        this.node = this;
        this.node.status({});
        this.name = this.config.name;
        this.authtype = this.config.authtype;
        if (this.node.credentials && this.node.credentials.hasOwnProperty("clientid")) {
            this.clientid = this.node.credentials.clientid;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("clientsecret")) {
            this.clientsecret = this.node.credentials.clientsecret;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("redirecturi")) {
            this.redirecturi = this.node.credentials.redirecturi;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("scopes")) {
            this.scopes = this.node.credentials.scopes;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("code")) {
            this.code = this.node.credentials.code;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("tokens")) {
            this.tokens = this.node.credentials.tokens;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("serviceaccount")) {
            this.serviceaccount = this.node.credentials.serviceaccount;
        }
        if (this.node.credentials && this.node.credentials.hasOwnProperty("apikey")) {
            this.apikey = this.node.credentials.apikey;
        }
        this.init();
    }
    async init() {
        if (NoderedUtil.IsNullEmpty(this.clientid) || NoderedUtil.IsNullEmpty(this.clientsecret) || NoderedUtil.IsNullEmpty(this.redirecturi)) return;
        var me = this;
        var oAuth2Client = new OAuth2Client(
            this.clientid,
            this.clientsecret,
            this.redirecturi
        );

        if (!NoderedUtil.IsNullEmpty(this.tokens)) {
            oAuth2Client.setCredentials(JSON.parse(this.tokens));
            return;
        }
        var authorizeUrl = oAuth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: this.scopes.split(",").join(" ")
        });
        var googleauthGetURL = function googleauthGetURL(req, res) {
            try {
                me.clientid = req.query.clientid;
                me.redirecturi = req.query.redirecturi;
                if (req.query.clientsecret != '__PWRD__') me.clientsecret = req.query.clientsecret;
                //
                oAuth2Client = new OAuth2Client(
                    me.clientid,
                    me.clientsecret,
                    me.redirecturi
                );
                authorizeUrl = oAuth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: req.query.scopes.split(",").join(" ")
                });
                RED.httpAdmin.get('/googleauth-code', googleauthCode);
                RED.httpAdmin.get('/googleauth-set-code', googleauthSetCode);
                res.json({ url: authorizeUrl });
            } catch (error) {
                res.status(500).send(error);
            }
        };
        var googleauthCode = function googleauthCode(req, res) {
            var code = req.query.code;
            res.json({ code: code });
        };
        var googleauthSetCode = async function googleauthSetCode(req, res) {
            try {
                // Now that we have the code, use that to acquire tokens.
                var code = req.query.code;
                const r = await oAuth2Client.getToken(code);
                // Make sure to set the credentials on the OAuth2 client.
                oAuth2Client.setCredentials(r.tokens);
                res.json({ tokens: r.tokens });
            } catch (error) {
                res.status(500).send(error);
            }
        };

        // We can find mappings by function name, so we start by cleaning up,
        // and add mappings as needed
        var removeRoute = function (route, i, routes) {
            if (route.handle.name == "googleauthGetURL" || route.handle.name == "googleauthCode" || route.handle.name == "googleauthSetCode") {
                routes.splice(i, 1);
            }
            if (route.route) route.route.stack.forEach(removeRoute);
        };
        RED.httpAdmin._router.stack.forEach(removeRoute);

        RED.httpAdmin.get('/googleauth-get-' + this.node.id, googleauthGetURL);
    }
}
export async function get_rpa_workflows(req, res) {
    try {
        var rawAssertion = req.user.getAssertionXml();
        var token = await NoderedUtil.GetTokenFromSAML(rawAssertion);
        var q: any = { _type: "workflow" };
        var result: any[] = await NoderedUtil.Query('openrpa', q,
            { name: 1, projectandname: 1 }, { projectid: -1, name: -1 }, 1000, 0, token.jwt, req.query.queue)
        res.json(result);
    } catch (error) {
        res.status(500).json(error);
    }
}

export interface Igoogleauth_request {
    config: string;
    method: string;
    url: string;
    name: string;
}
export class googleauth_request {
    public node: Red = null;
    public name: string = "";
    public _config: Igoogleauth_credentials;
    public method: string = "";
    public url: string = "";
    public auth: any = null;
    public Client: any = null;
    constructor(public config: Igoogleauth_request) {
        try {
            RED.nodes.createNode(this, config);
            this.node = this;
            this.node.status({ fill: "blue", shape: "dot", text: "Initializing" });
            this._config = RED.nodes.getNode(this.config.config);
            this.method = this.config.method;
            this.url = this.config.url;
            var cli = GetGoogleAuthClient(this._config);
            this.Client = cli.Client;
            this.auth = cli.auth;
            this.node.on('input', this.oninput);
            this.node.status({});
        } catch (error) {
            NoderedUtil.HandleError(this, error);
        }
    }

    async oninput(msg: any, send: any, done: any) {
        try {
            this.node.status({ fill: "blue", shape: "dot", text: "Getting client" });
            if (this.auth != null) {
                this.Client = await this.auth.getClient();
            }
            if (NoderedUtil.IsNullEmpty(this.method)) this.method = msg.method;
            if (NoderedUtil.IsNullEmpty(this.method)) this.method = "GET";
            if (NoderedUtil.IsNullEmpty(this.url)) this.url = msg.url;
            if (NoderedUtil.IsNullEmpty(this.url)) throw new Error("url is mandaotry");
            var url = this.url;
            if (this._config.authtype == "apikey" && !NoderedUtil.IsNullEmpty(this._config.apikey)) {
                if (url.indexOf("?") > -1) {
                    url = url + "&key=" + this._config.apikey;
                } else {
                    url = url + "?key=" + this._config.apikey;
                }
            }
            var options: any = {
                method: this.method,
                url,
                data: msg.payload
                // data: {
                //     payload: msg.payload
                // }
            };
            if (this.method == "GET") delete options.data;

            this.node.status({ fill: "blue", shape: "dot", text: "Requesting" });
            var res: any;
            if (this.Client != null) {
                msg.Client = this.Client.request;
                res = await this.Client.request(options);
                msg.config = res.config;
                msg.status = res.status;
                msg.statusText = res.statusText;
                msg.request = res.request;
                msg.payload = res.data;
                this.node.status({});
                send(msg);
                done();
            } else {
                msg.Client = request;
                // options.body = JSON.stringify(options.data);

                options.body = options.data;
                options.json = true;
                delete options.data;
                request(options, (error, response, body) => {
                    if (error) {
                        NoderedUtil.HandleError(this, error);
                        return done();
                    }
                    msg.payload = body;
                    msg.status = response.statusCode;
                    this.node.status({});
                    send(msg);
                    done();
                });
            }
        } catch (error) {
            done();
            NoderedUtil.HandleError(this, error);
        }
    }
    onclose() {
    }
}