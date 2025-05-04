import {Game} from "./game";
import {GamesCollection} from "../api/game";
import {Meteor} from "meteor/meteor";
import {Roles as MeteorRoles} from "meteor/roles";
import {Roles} from "./roles";

export class Player {
    identifier: string;
    name: string;
    email: string;
    roles: [string];
    history: [Game];

    get isAdmin() {
        return this.roles.includes(Roles.ADMIN);
    }

    /**
     *
     * @returns {Promise<void>}
     */
    async loadHistory() {
        this.history = await GamesCollection.find({players: this.identifier}).fetch();
    }

    /**
     *
     * @returns {Promise<Player|null>}
     */
    static async createForCurrentUser() {
        let currentUser = await Meteor.user();

        if (!currentUser) {
            return null;
        }

        return await Player.createFromMeteorUser(currentUser);
    }

    /**
     *
     * @param user
     * @returns {Promise<Player>}
     */
    static async createFromMeteorUser(user) {
        let roles = await MeteorRoles.getRolesForUserAsync(user._id);

        let player = new Player();

        player.identifier = user._id;
        player.name = user.username;
        player.email = user.emails[0].address;
        player.roles = roles;

        return player;
    }
}