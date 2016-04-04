import express from 'express';
import { expect } from 'chai';
import _ from 'lodash';
import bolt from 'slack-bolt';
import WebSocket from 'ws';
import bodyParser from 'body-parser';
import commands from '../build/commands/index';
import { slack, teamline } from './fixtures';

const LONG_DELAY = 10000;

describe('actions', function functions() {
  this.timeout(LONG_DELAY);

  let server;
  let bot;
  let ws;
  let app;
  let uri;
  let socket;
  before(done => {
    if (server) server.close();
    if (ws) ws.close();

    ws = new WebSocket.Server({ port: 9090 });
    app = express();
    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));
    server = app.listen(9091);

    bot = bolt({
      log: {
        level: 'silly'
      },
      teamline: {
        actionsChannel: false,
        teamsChannels: false
      }
    }, true);

    ws._events = {};

    ws.on('connection', s => socket = s);

    bot.connect('ws://127.0.0.1:9090');
    bot._api = 'http://127.0.0.1:9091/';
    uri = bot._api.slice(0, -1);

    Object.assign(bot, slack);

    app.get('/employee', (request, response, next) => {
      response.json(teamline.users[0]);
      next();
    });

    bot.on('ready', () => {
      commands(bot, uri);
      done();
    });
  });

  describe('remove', () => {
    it('should clear all actions for today when calling `actions clear`', (done) => {
      app.delete('/employee/:id/actions/today', () => {
        app._router.stack.length -= 1;
        done();
      });

      bot.inject('message', {
        text: 'actions clear',
        mention: true
      });
    });

    it('should remove the action specified by index (1 starting) from today\'s actions', (done) => {
      app.get('/employee/:id/actions/today', (request, response, next) => {
        response.json(teamline.actions);

        next();
      });

      app.delete('/action/0', () => {
        app._router.stack.length -= 2;
        done();
      });

      bot.inject('message', {
        text: 'actions remove 1',
        mention: true
      });
    });
  });

  describe('list', () => {
    context('simple', () => {
      it('should list all projects', done => {
        app.get('/projects/open', (request, response, next) => {
          const projects = teamline.projects.map(project => {
            const Team = _.find(teamline.teams, { id: project.TeamId });
            return { ...project, Team };
          });

          response.json(projects);
          next();
        });

        socket.on('message', message => {
          const msg = JSON.parse(message);
          teamline.projects.filter(a => typeof a.TeamId !== 'undefined').forEach(project => {
            expect(msg.text).to.have.string(project.name);
            const team = _.find(teamline.teams, { id: project.TeamId });
            expect(msg.text).to.have.string(team.name);
          });

          app._router.stack.length -= 1;
          delete socket._events.message;
          done();
        });

        bot.inject('message', {
          text: 'list all projects',
          mention: true
        });
      });

      it('should list all roles', done => {
        app.get('/roles/open', (request, response, next) => {
          const roles = teamline.roles.map(role => {
            const Team = _.find(teamline.teams, { id: role.TeamId });
            return { ...role, Teams: [Team] };
          });

          response.json(roles);
          next();
        });

        socket.on('message', message => {
          const msg = JSON.parse(message);
          teamline.roles.filter(a => a.TeamId).forEach(role => {
            expect(msg.text).to.have.string(role.name);
            const team = _.find(teamline.teams, { id: role.TeamId });
            expect(msg.text).to.have.string(team.name);
          });

          app._router.stack.length -= 1;
          delete socket._events.message;
          done();
        });

        bot.inject('message', {
          text: 'list all roles',
          mention: true
        });
      });

      it('should list all actions', done => {
        app.get('/actions', (request, response, next) => {
          const actions = teamline.actions.map(action => {
            const Project = _.find(teamline.project, { id: action.ProjectId });
            const Role = _.find(teamline.role, { id: action.RoleId });

            return { ...action, Project, Role };
          });

          response.json(actions);
          next();
        });

        socket.on('message', message => {
          const msg = JSON.parse(message);
          teamline.actions.filter(a => a.TeamId).forEach(action => {
            expect(msg.text).to.have.string(action.name);
            const project = _.find(teamline.project, { id: action.ProjectId });
            const role = _.find(teamline.role, { id: action.RoleId });
            expect(msg.text).to.have.any.string([project.name, role.name]);
          });

          app._router.stack.length -= 1;
          delete socket._events.message;
          done();
        });

        bot.inject('message', {
          text: 'list all actions',
          mention: true
        });
      });

      it('should list all teams', done => {
        app.get('/teams/open', (request, response, next) => {
          const teams = teamline.teams.map(team => {
            const Employees = _.filter(teamline.users, { TeamId: team.id });

            return { ...team, Employees };
          });
          response.json(teams);
          next();
        });

        app.get('/team/:id/employees', (request, response, next) => {
          const employees = _.filter(teamline.users, { TeamId: +request.params.id });
          response.json(employees);
          next();
        });

        app.get('/team/:id/managers', (request, response, next) => {
          const managers = _.filter(teamline.users, { ManagerOf: +request.params.id });
          response.json(managers);
          next();
        });

        socket.on('message', message => {
          const msg = JSON.parse(message);
          teamline.teams.forEach(team => {
            expect(msg.text).to.have.string(team.name);
            const employees = _.filter(teamline.users, { TeamId: team.id });
            const managers = _.filter(teamline.users, { ManagerOf: team.id });

            employees.forEach(employee => {
              expect(msg.text).to.have.string(employee.username);
            });
            managers.forEach(manager => {
              expect(msg.text).to.have.string(manager.username);
            });
          });

          app._router.stack.length -= 3;
          delete socket._events.message;
          done();
        });

        bot.inject('message', {
          text: 'list all teams',
          mention: true
        });
      });
    });

    context('scopes', () => {
      it('should list closed projects', done => {
        app.get('/projects/closed', (request, response, next) => {
          const projects = _.filter(teamline.projects, { closed: true }).map(project => {
            const Team = _.find(teamline.teams, { id: project.TeamId });
            return { ...project, Team };
          });

          response.json(projects);
          next();
        });

        socket.on('message', message => {
          const msg = JSON.parse(message);
          teamline.projects.filter(a => typeof a.TeamId !== 'undefined' && a.closed)
            .forEach(project => {
              expect(msg.text).to.have.string(project.name);
              const team = _.find(teamline.teams, { id: project.TeamId });
              expect(msg.text).to.have.string(team.name);
            });

          app._router.stack.length -= 1;
          delete socket._events.message;
          done();
        });

        bot.inject('message', {
          text: 'list all closed projects',
          mention: true
        });
      });
    });

    context('users', () => {
      it('should list specified user\'s projects', done => {
        app.get('/employee/:id/projects/open', () => {
          app._router.stack.length--;
          done();
        });

        bot.inject('message', {
          text: 'list my projects',
          mention: true
        });
      });
    });
  });

  describe('define', () => {
    before(() => {
      app.get('/projects/open', (request, response, next) => {
        const projects = teamline.projects.map(project => (
          { ...project, Employees: teamline.users }
        ));

        response.json(projects);
        next();
      });

      app.get('/roles/open', (request, response, next) => {
        const roles = teamline.roles.map(role => (
          { ...role, Employees: teamline.users }
        ));

        response.json(roles);
        next();
      });

      app.get('/teams/open', (request, response, next) => {
        const teams = teamline.teams.map(team => {
          const Employees = _.filter(teamline.users, { TeamId: team.id });
          return { ...team, Employees };
        });

        response.json(teams);
        next();
      });

      app.get('/employee/:id/actions/today', (request, response, next) => {
        const actions = teamline.actions.map(action => {
          const Project = _.find(teamline.projects, { id: action.ProjectId });
          const Role = _.find(teamline.role, { id: action.RoleId });

          return { ...action, Project, Role };
        });

        response.json(actions);
        next();
      });
    });

    context('simple', () => {
      it('should define actions for projects', done => {
        const ACTION = 'Some Action';

        app.get('/employee/:id/project', (request, response, next) => {
          response.json(teamline.projects[0]);
          next();
        });

        app.get('/project/:id/action', (request, response, next) => {
          expect(request.query.name).to.equal(ACTION);

          response.json();
          next();
        });

        app.post('/employee/:id/action', (request, response, next) => {
          expect(request.body.name).to.equal(ACTION);
          response.json(request.body);
          next();
        });

        app.get('/associate/action/:id/project/:id', (request, response, next) => {
          response.json();
          next();
        });

        app.get('/associate/project/:id/employee/:id', (request, response, next) => {
          response.json();

          done();
          next();

          app._router.stack.length -= 5;
        });

        bot.inject('message', {
          text: `actions ${teamline.projects[0].name} > ${ACTION}`,
          mention: true
        });
      });

      it('should define actions for roles', done => {
        const ACTION = 'Some Action';

        app.get('/employee/:id/role', (request, response, next) => {
          response.json(teamline.roles[0]);
          next();
        });

        app.get('/role/:id/action', (request, response, next) => {
          expect(request.query.name).to.equal(ACTION);

          response.json();
          next();
        });

        app.post('/employee/:id/action', (request, response, next) => {
          expect(request.body.name).to.equal(ACTION);
          response.json(request.body);
          next();
        });

        app.get('/associate/action/:id/role/:id', (request, response, next) => {
          response.json();
          next();
        });

        app.get('/associate/role/:id/employee/:id', (request, response, next) => {
          response.json();

          done();
          next();

          app._router.stack.length -= 5;
        });

        bot.inject('message', {
          text: `actions (${teamline.roles[0].name}) > ${ACTION}`,
          mention: true
        });
      });

      it('should create project and assign the team and add the action to it', done => {
        const ACTION = 'Some Action';
        const PROJECT = 'Some New Project';
        const TEAM = teamline.teams[0].name;

        app.post('/project', (request, response, next) => {
          expect(request.body.name).to.equal(PROJECT);

          response.json({ ...request.body, id: 'new_id' });
          next();
        });

        app.get('/team', (request, response, next) => {
          expect(request.query.name).to.equal(TEAM);

          response.json(teamline.teams[0]);
          next();
        });

        app.get('/employee/:id/project', (request, response, next) => {
          response.json({ name: PROJECT });
          next();
        });

        app.get('/project/:id/action', (request, response, next) => {
          expect(request.query.name).to.equal(ACTION);

          response.json();
          next();
        });

        app.post('/employee/:id/action', (request, response, next) => {
          expect(request.body.name).to.equal(ACTION);
          response.json(request.body);
          next();
        });

        app.get('/associate/action/:id/project/:id', (request, response, next) => {
          response.json();
          next();
        });

        app.get('/associate/project/:id/employee/:id', (request, response, next) => {
          response.json();
          next();
        });

        app.get('/associate/project/:id/team/:id', (request, response, next) => {
          done();
          next();

          app._router.stack.length -= 8;
        });

        bot.inject('message', {
          text: `actions ${TEAM} > +${PROJECT} > ${ACTION}`,
          mention: true
        });
      });
    });

    context('errors', () => {
      const t = (key, ...args) => bot.t(`teamline.actions.${key}`, ...args);

      it('should warn about duplicate project when using +', done => {
        const ACTION = 'Some Action';
        const PROJECT = teamline.projects[0].name;
        const TEAM = teamline.teams[0].name;

        app.get('/chat.postMessage', (request, response, next) => {
          const msg = request.query;
          const attachment = JSON.parse(msg.attachments)[0];

          expect(attachment.color).to.equal('warning');
          const text = t('define.errors.duplicate-project', { model: 'Project', name: PROJECT });
          expect(attachment.text).to.equal(text);

          app._router.stack.length--;
          done();
          next();
        });

        bot.inject('message', {
          text: `actions ${TEAM} > +${PROJECT} > ${ACTION}`,
          mention: true
        });
      });

      it('should error when the project doesn\'t exist', done => {
        const ACTION = 'Some Action';
        const PROJECT = 'nonsense shit';

        app.get('/chat.postMessage', (request, response, next) => {
          const msg = request.query;
          const attachment = JSON.parse(msg.attachments)[0];

          expect(attachment.color).to.equal('danger');
          const text = t('define.errors.notfound', {
            model: 'Project', name: PROJECT, action: ACTION, newSyntax: `+${PROJECT}`
          });
          expect(attachment.text).to.equal(text);

          app._router.stack.length--;
          done();
          next();
        });

        bot.inject('message', {
          text: `actions ${PROJECT} > ${ACTION}`,
          mention: true
        });
      });

      it('should error when the team doesn\'t exist', done => {
        const ACTION = 'Some Action';
        const PROJECT = teamline.projects[0].name;
        const TEAM = 'nonsense shit';

        app.get('/chat.postMessage', (request, response, next) => {
          const msg = request.query;
          const attachment = JSON.parse(msg.attachments)[0];

          expect(attachment.color).to.equal('danger');
          const text = t('define.errors.team-notfound', { team: TEAM });
          expect(attachment.text).to.equal(text);

          app._router.stack.length--;
          done();
          next();
        });

        bot.inject('message', {
          text: `actions ${TEAM} > ${PROJECT} > ${ACTION}`,
          mention: true
        });
      });
    });
  });

  after(async () => {
    if (server) server.close();
    if (ws) ws.close();
    await bot.stop();
  });
});
