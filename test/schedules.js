import { expect } from 'chai';
import { teamline } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';
import moment from 'moment';

const LONG_DELAY = 10000;

describe('schedules', function functions() {
  this.timeout(LONG_DELAY);

  let bot;
  let app;
  let socket;
  let t;
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    app = initialized.app;
    socket = initialized.socket;

    app.get('/employee', (request, response, next) => {
      response.json(teamline.users[0]);
      next();
    });
    t = (key, ...args) => bot.t(`teamline.schedules.${key}`, ...args);
  });

  describe('work-hours', () => {
    describe('schedules set', () => {
      it('should set schedule for everyone using keywords `all` `default` and `everyone`', done => { //eslint-disable-line
        app.get('/employees', (request, response, next) => {
          response.json(teamline.users);
          next();
        });

        app.delete('/employee/:id/workhours', (request, response, next) => {
          expect(+request.query.weekday).to.be.oneOf([0, 6]);
          response.json([]);
          next();
        });

        app.post('/employee/:id/workhour', (request, response, next) => {
          expect(+request.body.weekday).to.be.oneOf([0, 6]);
          response.json({
            id: 'workhour_id',
            ...request.body
          });
          next();
        });

        let i = 0;
        app.post('/workhour/:id/timerange', (request, response, next) => {
          expect(request.params.id).to.equal('workhour_id');
          expect(request.body.start).to.be.oneOf(['08:30', '10:00', '09:30']);
          expect(request.body.end).to.be.oneOf(['09:00', '18:00', '18:30']);
          response.json(request.body);

          if (i === 2) {
            done();
            next();
            app._router.stack.length -= 4;
          }

          i++;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules set default
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id
        });
      });

      it('should set schedule for specified user', done => { //eslint-disable-line
        app.delete('/employee/:id/workhours', (request, response, next) => {
          expect(+request.params.id).to.equal(teamline.users[0].id);
          expect(+request.query.weekday).to.be.oneOf([0, 6]);
          response.json([]);
          next();
        });

        app.post('/employee/:id/workhour', (request, response, next) => {
          expect(+request.params.id).to.equal(teamline.users[0].id);
          expect(+request.body.weekday).to.be.oneOf([0, 6]);
          response.json({
            id: 'workhour_id',
            ...request.body
          });
          next();
        });

        let i = 0;
        app.post('/workhour/:id/timerange', (request, response, next) => {
          expect(request.params.id).to.equal('workhour_id');
          expect(request.body.start).to.be.oneOf(['08:30', '10:00', '09:30']);
          expect(request.body.end).to.be.oneOf(['09:00', '18:00', '18:30']);
          response.json(request.body);

          if (i === 2) {
            done();
            next();
            app._router.stack.length -= 3;
          }

          i++;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules set ${bot.users[0].name}
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id
        });
      });

      after(cleanup);
    });

    describe('schedules unset', () => {
      before(() => {
        app.get('/employee', (request, response, next) => {
          response.json(bot.users[0]);

          next();
        });
      });
      it('should remove the specified day from user\'s schedule', done => {
        app.delete('/employee/:id/workhours', (request, response, next) => {
          expect(+request.query.weekday).to.equal(moment('sunday', 'dddd').weekday());

          next();
          done();
          app._router.stack.length -= 1;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };
        bot.inject('message', {
          text: `schedules unset ${bot.users[0].name} sunday`,
          mention: true,
          user: bot.users[0].id
        });
      });

      it('should remove the specified day from everyone\'s schedule', done => {
        app.delete('/workhours', (request, response, next) => {
          expect(+request.query.weekday).to.equal(moment('sunday', 'dddd').weekday());

          next();
          done();
          app._router.stack.length -= 1;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules unset all sunday`,
          mention: true,
          user: bot.users[0].id
        });
      });

      after(cleanup);
    });
  });

  describe('modify', () => {
    before(() => {
      app.get('/employees', (request, response, next) => {
        response.json(teamline.users);
        next();
      });

      app.get('/employee', (request, response, next) => {
        response.json(teamline.users[0]);
        next();
      });
    });

    describe('out', () => {
      context('simple', () => {
        it('should set a `sub` modification from now to end of working hour of the day', done => {
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment();
            const end = moment('18:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);
            expect(request.body.reason).to.equal('some reason');

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out\nsome reason`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('whole day', () => {
        it('should set a `sub` modification for the whole working hour of the day', done => {
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().add(1, 'day').weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('8:00', 'HH:mm').add(1, 'day');
            const end = moment('18:00', 'HH:mm').add(1, 'day');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);
            expect(request.body.reason).to.equal('some reason');

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out tomorrow\nsome reason`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('whole day', () => {
        it('should set a `sub` modification for the whole working hour of the day', done => {
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().add(1, 'day').weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('8:00', 'HH:mm').add(1, 'day');
            const end = moment('18:00', 'HH:mm').add(1, 'day');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);
            expect(request.body.reason).to.equal('some reason');

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out tomorrow\nsome reason`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('from', () => {
        it('should set a `sub` modifications from the specified time to the end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('12:00', 'HH:mm');
            const end = moment('18:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);
            expect(request.body.reason).to.equal('some reason');

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out from 12:00\nsome reason`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('to', () => {
        it('should set a `sub` modifications from now to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment();
            const end = moment('12:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('range', () => {
        it('should set a `sub` modifications in the specified range', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('11:00', 'HH:mm');
            const end = moment('12:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out from 11:00 to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('duration', () => {
        it('should set a `sub` modifications from now for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().format('HH:mm'),
                end: moment().add(2, 'hours').format('HH:mm')
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment();
            const end = moment().add(2, 'hours');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });

        it('should set a `sub` modifications from specified date for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('12:00', 'HH:mm');
            const end = start.clone().add(2, 'hours');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out 12:00 for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      it('should limit the daterange to workhour\'s boundaries', done => {
        app.get('/employee/:id/workhours', (request, response, next) => {
          response.json([{
            weekday: moment().weekday(),
            Timeranges: [{
              start: '8:00',
              end: '18:00'
            }]
          }]);

          next();
        });

        app.post('/employee/:id/schedulemodification', (request, response, next) => {
          response.json({
            id: 'workhour_id',
            ...request.body
          });

          expect(request.body.type).to.equal('sub');
          const start = moment('8:00', 'HH:mm');
          const end = moment('18:00', 'HH:mm');
          almostEqual(request.body.start, start);
          almostEqual(request.body.end, end);

          done();
          next();

          app._router.stack.length -= 2;
        });


        bot.inject('message', {
          text: 'schedules out from 1:00 to 23:00',
          mention: true,
          user: bot.users[0].id
        });
      });
    });

    describe('in', () => {
      context('to', () => {
        it('should set a `add` modifications from end of working hour to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('add');
            const start = moment('18:00', 'HH:mm');
            const end = moment('12:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('range', () => {
        it('should set a `add` modifications in the specified range', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('add');
            const start = moment('11:00', 'HH:mm');
            const end = moment('12:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in from 11:00 to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('duration', () => {
        it('should set a `add` modifications from end of working hour for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('add');
            const start = moment('18:00', 'HH:mm');
            const end = moment('20:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });

        it('should set a `add` modifications from specified date for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal('add');
            const start = moment('12:00', 'HH:mm');
            const end = start.clone().add(2, 'hours');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in 12:00 for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });
    });

    describe('shift', () => {
      context('from', () => {
        it('should set a `sub` modifications from the specified time to the end of working hour and `add` from end of working hour for the duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('12:00', 'HH:mm').toISOString(),
            end: moment('18:00', 'HH:mm').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('00:00', 'HH:mm').add(1, 'day').toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            almostEqual(request.body.start, expected[i].start);
            almostEqual(request.body.end, expected[i].end);

            if (i === 1) {
              done();
              next();

              app._router.stack.length -= 2;
            }

            i++;
          });

          bot.inject('message', {
            text: `schedules shift from 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('to', () => {
        it('should set a `sub` modifications from now to the specified time and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const duration = moment('12:00', 'HH:mm').diff(moment());
          const expected = [{
            type: 'sub',
            start: moment().toISOString(),
            end: moment('12:00', 'HH:mm').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('18:00', 'HH:mm').add(duration).toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            almostEqual(request.body.start, expected[i].start);
            almostEqual(request.body.end, expected[i].end);

            if (i === 1) {
              done();
              next();

              app._router.stack.length -= 2;
            }

            i++;
          });

          bot.inject('message', {
            text: `schedules shift to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('range', () => {
        it('should set a `sub` modifications in the specified range and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('11:00', 'HH:mm').toISOString(),
            end: moment('12:00', 'HH:mm').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('19:00', 'HH:mm').toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            almostEqual(request.body.start, expected[i].start);
            almostEqual(request.body.end, expected[i].end);

            if (i === 1) {
              done();
              next();

              app._router.stack.length -= 2;
            }

            i++;
          });

          bot.inject('message', {
            text: `schedules shift from 11:00 to 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('duration', () => {
        it('should set a `sub` modifications from now for the specified duration and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment().toISOString(),
            end: moment().add(2, 'hours').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('20:00', 'HH:mm').toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            almostEqual(request.body.start, expected[i].start);
            almostEqual(request.body.end, expected[i].end);

            if (i === 1) {
              done();
              next();

              app._router.stack.length -= 2;
            }

            i++;
          });

          bot.inject('message', {
            text: `schedules shift for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });

        it('should set a `sub` modifications from specified date for the specified duration and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('12:00', 'HH:mm').toISOString(),
            end: moment('14:00', 'HH:mm').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('20:00', 'HH:mm').toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            almostEqual(request.body.start, expected[i].start);
            almostEqual(request.body.end, expected[i].end);

            if (i === 1) {
              done();
              next();

              app._router.stack.length -= 2;
            }

            i++;
          });

          bot.inject('message', {
            text: `schedules shift 12:00 for 2 hours`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });
    });

    describe('undo', () => {
      it('should remove the last modification submitted', done => {
        const start = moment();
        const end = moment().add(1, 'hour');

        app.get('/employee/:id/schedulemodifications', (request, response, next) => {
          response.json([{}, {
            id: 'last_modification',
            start, end
          }]);
          next();
        });

        app.delete('/schedulemodification/:id', (request, response, next) => {
          expect(request.params.id).to.equal('last_modification');

          next();
          done();
          app._router.stack.length -= 2;
        });


        bot.inject('message', {
          text: 'schedules undo',
          mention: true,
          user: bot.users[0].id
        });
      });

      it('should remove the last message from user in channel', done => {
        const start = moment();
        const end = moment().add(1, 'hour');

        app.get('/employee/:id/schedulemodifications', (request, response, next) => {
          response.json([{}, {
            id: 'last_modification',
            start, end
          }]);
          next();
        });

        app.delete('/schedulemodification/:id', (request, response, next) => {
          expect(request.params.id).to.equal('last_modification');
          response.json({ ok: true });

          next();
        });

        app.get('/channels.history', (request, response, next) => {
          response.json({
            ok: true,
            messages: [
              {
                ts: 'new',
                username: bot.users[0].name
              },
              {
                ts: 'old',
                username: bot.users[0].name
              }
            ]
          });

          next();
        });

        app.get('/chat.delete', (request, response, next) => {
          expect(request.query.ts).to.equal('new');

          next();
          done();
          app._router.stack.length -= 4;
        });

        bot.inject('message', {
          text: 'schedules undo',
          mention: true,
          user: bot.users[0].id
        });
      });
    });

    after(cleanup);
  });

  describe('available', () => {
    before(() => {
      app.get('/employee', (request, response, next) => {
        response.json(bot.users[0]);

        next();
      });
    });

    it('should indicate the employee is currently available if the working hours match', done => {
      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([{
          weekday: moment().weekday(),
          Timeranges: [{
            start: moment().subtract(1, 'hour').format('HH:mm'),
            end: moment().add(1, 'hour').format('HH:mm')
          }]
        }]);
        next();
      });

      app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
        response.json([]);

        next();
      });

      socket.on('message', message => {
        const msg = JSON.parse(message);
        expect(msg.text).to.equal(t('available.now'));

        app._router.stack.length -= 2;
        socket._events.message.length -= 1;
        done();
      });

      bot.inject('message', {
        text: 'available someone',
        mention: true
      });
    });

    it('should give information on the next timerange the employee will be available, if not available now', done => { // eslint-disable-line
      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([{
          weekday: moment().weekday(),
          Timeranges: [{
            start: moment().subtract(2, 'hour').format('HH:mm'),
            end: moment().subtract(1, 'hour').format('HH:mm')
          }, {
            start: moment().add(1, 'hour').format('HH:mm'),
            end: moment().add(2, 'hour').format('HH:mm')
          }]
        }]);
        next();
      });

      app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
        response.json([]);

        next();
      });

      app.get('/chat.postMessage', (request, response, next) => {
        expect(request.query.text).to.equal(t('available.range', {
          start: `*${moment().add(1, 'hour').format('HH:mm')}*`,
          end: `*${moment().add(2, 'hour').format('HH:mm')}*`
        }));

        app._router.stack.length -= 3;
        next();
        done();
      });

      bot.inject('message', {
        text: 'available someone',
        mention: true
      });
    });

    it('should indicate if employee is not available on the specified day', done => {
      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([]);
        next();
      });

      app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
        response.json([]);

        next();
      });

      socket.on('message', message => {
        const msg = JSON.parse(message);
        expect(msg.text).to.equal(t('available.not', { date: 'tomorrow' }));

        app._router.stack.length -= 2;
        socket._events.message.length -= 1;
        done();
      });

      bot.inject('message', {
        text: 'available someone tomorrow',
        mention: true
      });
    });
  });

  after(cleanup);
});

const almostEqual = (d1, d2) => expect(Math.abs(moment(d1).diff(d2, 'seconds'))).to.be.lt(2);
