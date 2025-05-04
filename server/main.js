import { Meteor } from 'meteor/meteor';
import { Accounts } from 'meteor/accounts-base';
import { Roles as MeteorRoles } from 'meteor/roles';
import SimpleSchema  from 'meteor/aldeed:simple-schema';
import {GamesCollection} from '/imports/api/game';
import {Game} from "../imports/models/game";
import {Roles} from "../imports/models/roles";

const SEED_USERMAIL = 'meteorite@gmail.com';
const SEED_USERNAME = 'meteorite';
const SEED_PASSWORD = 'password';

const SEED_USERMAIL2 = 'meteorite2@gmail.com';
const SEED_USERNAME2 = 'meteorite2';

// Ensuring every user has an email address, should be in server-side code
Accounts.validateNewUser((user) => {
  new SimpleSchema({
    _id: { type: String },
    username: { type: String },
    emails: { type: Array },
    'emails.$': { type: Object },
    'emails.$.address': { type: String },
    'emails.$.verified': { type: Boolean },
    createdAt: { type: Date },
    services: { type: Object, blackbox: true }
  }).validate(user);

  // Return true to allow user creation to proceed
  return true;
});

Meteor.startup(async () => {

  // Create roles
  await MeteorRoles.createRoleAsync(Roles.USER);
  await MeteorRoles.createRoleAsync(Roles.ADMIN);

  // Create seed user
  if (!(await Accounts.findUserByUsername(SEED_USERNAME))) {
    let user = await Accounts.createUserAsync({
      username: SEED_USERNAME,
      email: SEED_USERMAIL,
      password: SEED_PASSWORD,
    });
    await MeteorRoles.addUsersToRolesAsync(user, [Roles.USER, Roles.ADMIN], null);
  }

  // Create seed user
  if (!(await Accounts.findUserByUsername(SEED_USERNAME2))) {
    let user = await Accounts.createUserAsync({
      username: SEED_USERNAME2,
      email: SEED_USERMAIL2,
      password: SEED_PASSWORD,
    });
    await MeteorRoles.addUsersToRolesAsync(user, [Roles.USER, Roles.ADMIN], null);
  }

  // Server-side publication with reactive transformation
  Meteor.publish('gameWithTransform', async function () {
    const self = this;

    const handle = await GamesCollection.find({
      players: {
        $elemMatch: {identifier: this.userId}
      }
    }).observeChanges({
      added(id, fields) {
        const transformedDoc = Game.createFromDocument({_id: id, ...fields});
        self.added('games', id, transformedDoc);
      },
      changed(id, fields) {
        self.changed('games', id, fields);
      },
      removed(id) {
        self.removed('games', id);
      },
    });

    self.ready();

    // Stop observing when the subscription stops
    self.onStop(() => handle.stop());
  });
});
