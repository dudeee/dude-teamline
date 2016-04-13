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
  before(async () => {
    const initialized = await initialize();
    bot = initialized.bot;
    app = initialized.app;

    app.get('/employee', (request, response, next) => {
      response.json(teamline.users[0]);
      next();
    });
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

    describe('schedules remove', () => {
      before(() => {
        app.get('/employee', (request, response, next) => {
          response.json(bot.users[0]);

          next();
        });
      });
      it('should remove the specified day from user\'s schedule', done => {
        app.delete('/employee/:id/workhours', (request, response, next) => {
          expect(+request.query.weekday).to.equal(moment('sunday', 'dddd').day());

          next();
          done();
          app._router.stack.length -= 1;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };
        bot.inject('message', {
          text: `schedules remove ${bot.users[0].name} sunday`,
          mention: true,
          user: bot.users[0].id
        });
      });

      it('should remove the specified day from everyone\'s schedule', done => {
        app.delete('/workhours', (request, response, next) => {
          expect(+request.query.weekday).to.equal(moment('sunday', 'dddd').day());

          next();
          done();
          app._router.stack.length -= 1;
        });

        bot.config.permissions = {
          admin: [bot.users[0].name]
        };

        bot.inject('message', {
          text: `schedules remove all sunday`,
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
      context('from', () => {
        it('should set a `sub` modifications from the specified time to the end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().day(),
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
            expect(request.body.start).to.equal(start.toISOString());
            const end = moment('18:00', 'HH:mm');
            expect(request.body.end).to.equal(end.toISOString());

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out from 12:00`,
            mention: true,
            user: bot.users[0].id
          });
        });
      });

      context('to', () => {
        it('should set a `sub` modifications from now to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().day(),
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
            const start = moment().milliseconds(0);
            const approx = moment(new Date(request.body.start)).milliseconds(0);
            expect(approx.toISOString()).to.equal(start.toISOString());
            const end = moment('12:00', 'HH:mm');
            expect(request.body.end).to.equal(end.toISOString());

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
              weekday: moment().day(),
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
            expect(request.body.start).to.equal(start.toISOString());
            const end = moment('12:00', 'HH:mm');
            expect(request.body.end).to.equal(end.toISOString());

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
              weekday: moment().day(),
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
            const start = moment().milliseconds(0);
            const approxStart = moment(new Date(request.body.start)).milliseconds(0);
            expect(approxStart.toISOString()).to.equal(start.toISOString());

            const end = moment().add(2, 'hours').milliseconds(0);
            const approxEnd = moment(new Date(request.body.end)).milliseconds(0);
            expect(approxEnd.toISOString()).to.equal(end.toISOString());

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
      });
    });

    describe('in', () => {
      context('to', () => {
        it('should set a `add` modifications from end of working hour to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().day(),
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
            expect(request.body.start).to.equal(start.toISOString());
            const end = moment('12:00', 'HH:mm');
            expect(request.body.end).to.equal(end.toISOString());

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
              weekday: moment().day(),
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
            expect(request.body.start).to.equal(start.toISOString());
            const end = moment('12:00', 'HH:mm');
            expect(request.body.end).to.equal(end.toISOString());

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
              weekday: moment().day(),
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
            expect(moment(request.body.start).diff(start, 'seconds')).to.be.lt(2);

            const end = moment('20:00', 'HH:mm');
            expect(moment(request.body.end).diff(end, 'seconds')).to.be.lt(2);

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
      });
    });

    describe('shift', () => {
      context('from', () => {
        it('should set a `sub` modifications from the specified time to the end of working hour and `add` from end of working hour for the duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().day(),
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
            expect(request.body.start).to.equal(expected[i].start);
            expect(request.body.end).to.equal(expected[i].end);

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
              weekday: moment().day(),
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
            start: moment().milliseconds(0).toISOString(),
            end: moment('12:00', 'HH:mm').toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('18:00', 'HH:mm').add(duration).milliseconds(0).toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            const approxStart = moment(new Date(request.body.start)).milliseconds(0);
            expect(approxStart.diff(expected[i].start, 'seconds')).to.be.lt(2);
            const approxEnd = moment(new Date(request.body.end)).milliseconds(0);
            expect(approxEnd.diff(expected[i].end, 'seconds')).to.be.lt(2);

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
              weekday: moment().day(),
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
            const approxStart = moment(new Date(request.body.start)).milliseconds(0);
            expect(approxStart.diff(expected[i].start, 'seconds')).to.be.lt(2);
            const approxEnd = moment(new Date(request.body.end)).milliseconds(0);
            expect(approxEnd.diff(expected[i].end, 'seconds')).to.be.lt(2);

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
              weekday: moment().day(),
              Timeranges: [{
                start: '8:00',
                end: '18:00'
              }]
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment().milliseconds(0).toISOString(),
            end: moment().add(2, 'hours').milliseconds(0).toISOString()
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('20:00', 'HH:mm').milliseconds(0).toISOString()
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body
            });

            expect(request.body.type).to.equal(expected[i].type);
            const approxStart = moment(new Date(request.body.start)).milliseconds(0);
            expect(approxStart.diff(expected[i].start, 'seconds')).to.be.lt(2);
            const approxEnd = moment(new Date(request.body.end)).milliseconds(0);
            expect(approxEnd.diff(expected[i].end, 'seconds')).to.be.lt(2);

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
      });
    });

    after(cleanup);
  });


  after(cleanup);
});
