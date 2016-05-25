import { expect } from 'chai';
import { teamline } from './fixtures';
import initialize from './initialize';
import cleanup from './cleanup';
import moment from 'moment';
import _ from 'lodash';

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
            ...request.body,
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
          admin: [bot.users[0].name],
        };

        bot.inject('message', {
          text: `schedules set default
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id,
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
            ...request.body,
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
          admin: [bot.users[0].name],
        };

        bot.inject('message', {
          text: `schedules set ${bot.users[0].name}
                 saturday > 8:30 - 9:00, 10:00 - 18:00
                 sunday > 9:30 - 18:30`,
          mention: true,
          user: bot.users[0].id,
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
          admin: [bot.users[0].name],
        };
        bot.inject('message', {
          text: `schedules unset ${bot.users[0].name} sunday`,
          mention: true,
          user: bot.users[0].id,
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
          admin: [bot.users[0].name],
        };

        bot.inject('message', {
          text: `schedules unset all sunday`,
          mention: true,
          user: bot.users[0].id,
        });
      });
    });

    describe('view schedules', () => {
      before(() => {
        app.get('/employee/:id/workhours', (request, response, next) => {
          response.json([{
            weekday: 0,
            Timeranges: [{
              start: '8:30',
              end: '18:00',
            }],
          }, {
            weekday: 1,
            Timeranges: [{
              start: '8:30',
              end: '18:00',
            }],
          }, {
            weekday: 2,
            Timeranges: [{
              start: '14:00',
              end: '18:00',
            }],
          }]);

          next();
        });

        app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
          const modifications = [{
            type: 'sub',
            start: moment('9:00', 'HH:mm').weekday(0),
            end: moment('17:00', 'HH:mm').weekday(0),
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').weekday(1),
            end: moment('19:00', 'HH:mm').weekday(1),
          }, {
            type: 'add',
            start: moment('10:00', 'HH:mm').add(1, 'week').weekday(2),
            end: moment('14:00', 'HH:mm').add(1, 'week').weekday(2),
          }];

          const filtered = modifications.filter(m =>
            moment(request.query.start.$gte).isBefore(m.start) &&
            moment(request.query.end.$lt).isAfter(m.end)
          );
          response.json(filtered);

          next();
        });
      })

      it('should list current week\'s schedule', async done => {
        const expected = [
          [{
            start: '08:30',
            end: '09:00',
          }, {
            start: '17:00',
            end: '18:00',
          }],
          [{
            start: '08:30',
            end: '19:00',
          }],
          [{
            start: '14:00',
            end: '18:00',
          }],
        ];

        app.get('/chat.postMessage', (request, response, next) => {
          const attachments = JSON.parse(request.query.attachments);

          attachments.forEach((attachment, index) => {
            if (!attachment.fields) return;
            const times = attachment.fields.reduce((t, field) => {
              if (field.title === 'From') {
                t.push({ start: field.value });
              } else {
                t[t.length - 1].end = field.value;
              }

              return t;
            }, []);

            expect(times).to.eql(expected[index]);
          });

          next();
          done();

          app._router.stack.length -= 1;
        });

        bot.inject('message', {
          text: 'sch',
          mention: true,
        });
      });

      it('should list next week\'s schedule', async done => {
        const expected = [
          [{
            start: '08:30',
            end: '18:00',
          }],
          [{
            start: '08:30',
            end: '18:00',
          }],
          [{
            start: '10:00',
            end: '18:00',
          }],
        ];

        app.get('/chat.postMessage', (request, response, next) => {
          const attachments = JSON.parse(request.query.attachments);

          attachments.forEach((attachment, index) => {
            if (!attachment.fields) return;
            const times = attachment.fields.reduce((t, field) => {
              if (field.title === 'From') {
                t.push({ start: field.value });
              } else {
                t[t.length - 1].end = field.value;
              }

              return t;
            }, []);

            expect(times).to.eql(expected[index]);
          });

          next();
          done();

          app._router.stack.length -= 1;
        });

        bot.inject('message', {
          text: 'sch myself next week',
          mention: true,
        });
      });

      it('should list default schedule', async done => {
        const expected = [
          [{
            start: '08:30',
            end: '18:00',
          }],
          [{
            start: '08:30',
            end: '18:00',
          }],
          [{
            start: '14:00',
            end: '18:00',
          }],
        ];

        app.get('/chat.postMessage', (request, response, next) => {
          const attachments = JSON.parse(request.query.attachments);

          attachments.forEach((attachment, index) => {
            if (!attachment.fields) return;
            const times = attachment.fields.reduce((t, field) => {
              if (field.title === 'From') {
                t.push({ start: field.value });
              } else {
                t[t.length - 1].end = field.value;
              }

              return t;
            }, []);

            expect(times).to.eql(expected[index]);
          });

          next();
          done();

          app._router.stack.length -= 1;
        });

        bot.inject('message', {
          text: 'sch myself default',
          mention: true,
        });
      });
    })

    after(cleanup);
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

      app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
        response.json([]);
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
                start: moment().subtract(1, 'hour').format('HH:mm'),
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });
      });

      context('to', () => {
        it('should set a `sub` modifications from now to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().subtract(1, 'hour').format('HH:mm'),
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
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
                end: '11:00',
              }, {
                start: '15:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('15:00', 'HH:mm');
            const end = moment('15:15', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out 15:00 to 15:15`,
            mention: true,
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications in the specified range in specified day', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().add(1, 'day').weekday(),
              Timeranges: [{
                start: '8:00',
                end: '11:00',
              }, {
                start: '15:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
            });

            expect(request.body.type).to.equal('sub');
            const start = moment('15:00', 'HH:mm').add(1, 'day');
            const end = moment('15:15', 'HH:mm').add(1, 'day');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules out tomorrow 15:00 to 15:15`,
            mention: true,
            user: bot.users[0].id,
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
                end: moment().add(2, 'hours').format('HH:mm'),
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications from now for the specified duration (no `for`)', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().format('HH:mm'),
                end: moment().add(2, 'hours').format('HH:mm'),
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            text: `schedules out 2 hours`,
            mention: true,
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications from specified date for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });
      });

      it('should limit the daterange to workhour\'s boundaries', done => {
        app.get('/employee/:id/workhours', (request, response, next) => {
          response.json([{
            weekday: moment().weekday(),
            Timeranges: [{
              start: '8:00',
              end: '18:00',
            }],
          }]);

          next();
        });

        app.post('/employee/:id/schedulemodification', (request, response, next) => {
          response.json({
            id: 'workhour_id',
            ...request.body,
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
          user: bot.users[0].id,
        });
      });
    });

    describe('in', () => {
      context('from', () => {
        it('should set a `add` modifications from specified time to start of next working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
            });

            expect(request.body.type).to.equal('add');
            const start = moment('5:00', 'HH:mm');
            const end = moment('8:00', 'HH:mm');
            almostEqual(request.body.start, start);
            almostEqual(request.body.end, end);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in from 5:00`,
            mention: true,
            user: bot.users[0].id,
          });
        });
      });

      context('to', () => {
        it('should set a `add` modifications from end of working hour to the specified time', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });

        it('should set a `add` modifications from specified date for the specified duration', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });
      });

      context('simple', () => {
        it('should create an `add` modification from now until start of next timerange if the working hour has not started yet', done => { // eslint-disable-line
          const start = moment().add(1, 'hour').seconds(0);
          const end = moment().add(2, 'hour').seconds(0);
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: start.format('HH:mm'),
                end: end.format('HH:mm'),
              }],
            }]);

            next();
          });

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
            });

            expect(request.body.type).to.equal('add');
            almostEqual(request.body.start, moment());
            almostEqual(request.body.end, start);

            done();
            next();

            app._router.stack.length -= 2;
          });

          bot.inject('message', {
            text: `schedules in`,
            mention: true,
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('12:00', 'HH:mm').toISOString(),
            end: moment('18:00', 'HH:mm').toISOString(),
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('00:00', 'HH:mm').add(1, 'day').toISOString(),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });
      });

      context('to', () => {
        it('should set a `sub` modifications from now to the specified time and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().add(1, 'hour').format('HH:mm'),
                end: moment().add(3, 'hour').format('HH:mm'),
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment().add(1, 'hour'),
            end: moment().add(2, 'hour'),
          }, {
            type: 'add',
            start: moment().add(3, 'hour'),
            end: moment().add(4, 'hour'),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            text: `schedules shift to ${moment().add(1, 'hour').format('HH:mm')}`,
            mention: true,
            user: bot.users[0].id,
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
                end: '18:00',
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('11:00', 'HH:mm').toISOString(),
            end: moment('12:00', 'HH:mm').toISOString(),
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('19:00', 'HH:mm').toISOString(),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });
      });

      context('duration', () => {
        it('should set a `sub` modifications from now for the specified duration and `add` the duration to end of working hour (before schedule)', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().add(1, 'hour').format('HH:mm'),
                end: moment().add(5, 'hour').format('HH:mm'),
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment().add(1, 'hour'),
            end: moment().add(3, 'hour'),
          }, {
            type: 'add',
            start: moment().add(5, 'hour'),
            end: moment().add(7, 'hour'),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications from now for the specified duration and `add` the duration to end of working hour (in schedule)', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: moment().subtract(1, 'hour').format('HH:mm'),
                end: moment().add(3, 'hour').format('HH:mm'),
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment(),
            end: moment().add(2, 'hours'),
          }, {
            type: 'add',
            start: moment().add(3, 'hour'),
            end: moment().add(5, 'hour'),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            text: `schedules shift 2 hours`,
            mention: true,
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications from specified date for the specified duration and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('12:00', 'HH:mm').toISOString(),
            end: moment('14:00', 'HH:mm').toISOString(),
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').toISOString(),
            end: moment('20:00', 'HH:mm').toISOString(),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            user: bot.users[0].id,
          });
        });

        it('should set a `sub` modifications from specified date in past/future for the specified duration and `add` the duration to end of working hour', done => { //eslint-disable-line
          app.get('/employee/:id/workhours', (request, response, next) => {
            response.json([{
              weekday: moment().subtract(1, 'day').weekday(),
              Timeranges: [{
                start: '8:00',
                end: '18:00',
              }],
            }]);

            next();
          });

          const expected = [{
            type: 'sub',
            start: moment('12:00', 'HH:mm').subtract(1, 'day').toISOString(),
            end: moment('14:00', 'HH:mm').subtract(1, 'day').toISOString(),
          }, {
            type: 'add',
            start: moment('18:00', 'HH:mm').subtract(1, 'day').toISOString(),
            end: moment('20:00', 'HH:mm').subtract(1, 'day').toISOString(),
          }];
          let i = 0;

          app.post('/employee/:id/schedulemodification', (request, response, next) => {
            response.json({
              id: 'workhour_id',
              ...request.body,
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
            text: `schedules shift yesterday 12:00 for 2 hours`,
            mention: true,
            user: bot.users[0].id,
          });
        });
      });

      it('should limit the daterange to workhour\'s boundaries', done => {
        app.get('/employee/:id/workhours', (request, response, next) => {
          response.json([{
            weekday: moment().weekday(),
            Timeranges: [{
              start: '8:00',
              end: '18:00',
            }],
          }]);

          next();
        });

        const expected = [{
          start: moment('8:00', 'HH:mm'),
          end: moment('18:00', 'HH:mm'),
        }, {
          start: moment('18:00', 'HH:mm'),
          end: moment('4:00', 'HH:mm').add(1, 'day'),
        }];

        let i = 0;

        app.post('/employee/:id/schedulemodification', (request, response, next) => {
          response.json({
            id: 'workhour_id',
            ...request.body,
          });

          const { start, end } = expected[i++];
          expect(request.body.type).to.equal('sub');
          almostEqual(request.body.start, start);
          almostEqual(request.body.end, end);

          done();
          next();

          app._router.stack.length -= 2;
        });


        bot.inject('message', {
          text: 'schedules shift from 1:00 to 23:00',
          mention: true,
          user: bot.users[0].id,
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
            start, end,
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
          user: bot.users[0].id,
        });
      });

      it('should remove the last 2 modifications submitted in case of `shift`', done => {
        const start = moment();
        const end = moment().add(1, 'hour');

        app.get('/employee/:id/schedulemodifications', (request, response, next) => {
          response.json([{}, {
            id: 'other_modification',
            start, end,
            shift: true,
          }, {
            id: 'last_modification',
            start, end,
            shift: true,
          }]);

          next();
        });

        const expected = ['last_modification', 'other_modification'];
        let i = 0;
        app.delete('/schedulemodification/:id', (request, response, next) => {
          expect(request.params.id).to.equal(expected[i++]);

          next();
          done();
          app._router.stack.length -= 2;
        });


        bot.inject('message', {
          text: 'schedules undo',
          mention: true,
          user: bot.users[0].id,
        });
      });

      it('should remove modifications applied in a day', done => {
        app.get('/employee/:id/schedulemodifications', (request, response, next) => {
          response.json([{}, {
            id: 'other_modification',
            start: moment().add(1, 'day'),
            end: moment().add(1, 'day'),
          }, {
            id: 'last_modification',
            start: moment(),
            end: moment().add(1, 'hour'),
          }]);

          next();
        });

        app.delete('/schedulemodification/:id', (request, response, next) => {
          expect(request.params.id).to.equal('other_modification');

          next();
          done();
          app._router.stack.length -= 2;
        });


        bot.inject('message', {
          text: 'schedules undo tomorrow',
          mention: true,
          user: bot.users[0].id,
        });
      });

      it('should remove correct message from the channel', async done => {
        const start = moment();
        const end = moment().add(1, 'hour');

        const list = [{ modification: 'last_modification', message: '123' }];
        await bot.pocket.put('teamline.schedules.notify.messages', list);

        app.get('/employee/:id/schedulemodifications', (request, response, next) => {
          response.json([{}, {
            id: 'last_modification',
            start, end,
          }]);
          next();
        });

        app.delete('/schedulemodification/:id', (request, response, next) => {
          expect(request.params.id).to.equal('last_modification');
          response.json({ ok: true });

          next();
        });

        app.get('/chat.delete', (request, response, next) => {
          expect(request.query.ts).to.equal('123');

          next();
          done();
          app._router.stack.length -= 4;
        });

        bot.inject('message', {
          text: 'schedules undo',
          mention: true,
          user: bot.users[0].id,
        });
      });
    });

    after(cleanup);
  });

  describe('notify', () => {
    before(async () => {
      app.get('/employee', (request, response, next) => {
        const user = _.find(teamline.users, { username: request.query.username });
        response.json(user);
        next();
      });

      await bot.pocket.del(`schedules.notify`);
    });

    it('should add username to notify list if it\'s valid', done => {
      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const username = bot.users[1].name;
        const text = bot.t('teamline.schedules.notify.add', { username });
        expect(msg.text).to.equal(text);

        const notify = await bot.pocket.get(`schedules.notify`);
        console.log(notify);
        expect(notify[bot.users[1].name]).to.include(bot.users[0].name);

        done();
        socket._events.message.length -= 1;
        await bot.pocket.del(`schedules.notify`);
      });

      bot.inject('message', {
        text: `schedule notify ${bot.users[1].name}`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should throw an error if username is not valid', done => {
      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const text = bot.t('teamline.user.not_found', { username: 'blablabla' });
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
      });

      bot.inject('message', {
        text: `schedule notify blablabla`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should not add username to notify list if it\'s a duplicate', async done => {
      await bot.pocket.put(`schedules.notify`, { [bot.users[1].name]: [bot.users[0].name] });

      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const username = bot.users[1].name;
        const text = bot.t('teamline.schedules.notify.duplicate', { username });
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
      });

      bot.inject('message', {
        text: `schedule notify ${bot.users[1].name}`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should list users in notify list if no argument is given', async done => {
      await bot.pocket.put(`schedules.notify`, {
        [bot.users[1].name]: [bot.users[0].name],
        [bot.users[2].name]: [bot.users[0].name],
      });

      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const list = [bot.users[1].name, bot.users[2].name];
        const text = bot.t('teamline.schedules.notify.list', { list: list.join(', ') });
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
      });

      bot.inject('message', {
        text: `schedule notify`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should indicate the notify list is empty', async done => {
      await bot.pocket.del(`schedules.notify`);
      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const text = bot.t('teamline.schedules.notify.empty');
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
      });

      bot.inject('message', {
        text: `schedule notify`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    after(cleanup);
  });

  describe('!notify', () => {
    before(async () => {
      app.get('/employee', (request, response, next) => {
        const user = _.find(teamline.users, { username: request.query.username });
        response.json(user);
        next();
      });

      await bot.pocket.del(`schedules.notify.${bot.users[0].name}`);
    });

    it('should remove username from notify list if it\'s valid', async done => {
      await bot.pocket.put(`schedules.notify`, { [bot.users[1].name]: [bot.users[0].name] });

      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const username = bot.users[1].name;
        const text = bot.t('teamline.schedules.notify.remove', { username });
        expect(msg.text).to.equal(text);

        const notify = await bot.pocket.get(`schedules.notify`);
        expect(notify[bot.users[1].name]).to.not.include(bot.users[0].name);

        done();
        socket._events.message.length -= 1;
        await bot.pocket.del(`schedules.notify`);
      });

      bot.inject('message', {
        text: `schedule !notify ${bot.users[1].name}`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should throw an error if username is not valid', done => {
      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const text = bot.t('teamline.user.not_found', { username: 'blablabla' });
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
      });

      bot.inject('message', {
        text: `schedule !notify blablabla`,
        mention: true,
        user: bot.users[0].id,
      });
    });

    it('should not remove username from notify list if it doesn\'t exist in list', async done => {
      socket.on('message', async message => {
        const msg = JSON.parse(message);

        const username = bot.users[1].name;
        const text = bot.t('teamline.schedules.notify.notfound', { username });
        expect(msg.text).to.equal(text);

        done();
        socket._events.message.length -= 1;
        await bot.pocket.del(`schedules.notify`);
      });

      bot.inject('message', {
        text: `schedule !notify ${bot.users[1].name}`,
        mention: true,
        user: bot.users[0].id,
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
            end: moment().add(1, 'hour').format('HH:mm'),
          }],
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
        mention: true,
      });
    });

    it('should give information on the next timerange the employee will be available, if not available now', done => { // eslint-disable-line
      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([{
          weekday: moment().weekday(),
          Timeranges: [{
            start: moment().subtract(2, 'hour').format('HH:mm'),
            end: moment().subtract(1, 'hour').format('HH:mm'),
          }, {
            start: moment().add(1, 'hour').format('HH:mm'),
            end: moment().add(2, 'hour').format('HH:mm'),
          }],
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
          end: `*${moment().add(2, 'hour').format('HH:mm')}*`,
        }));

        app._router.stack.length -= 3;
        next();
        done();
      });

      bot.inject('message', {
        text: 'available someone',
        mention: true,
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
        mention: true,
      });
    });

    it('should indicate of a list of employees are available on a certain time', done => {
      app._router.stack.length--;

      app.get('/employee', (request, response, next) => {
        const index = bot.users.findIndex(b => b.name === request.query.username);
        response.json(teamline.users[index]);

        next();
      });

      const workhours = [{
        start: '8:30',
        end: '18:00',
      }, {
        start: '15:00',
        end: '18:00',
      }];

      let i = 0;
      app.get('/employee/:id/workhours', (request, response, next) => {
        response.json([{
          weekday: moment().weekday(0),
          Timeranges: [workhours[i++]],
        }]);

        if (i === 2) {
          i = 0;
        }
        next();
      });

      app.get('/employee/:id/schedulemodifications/accepted', (request, response, next) => {
        response.json([]);

        next();
      });

      const expected = [
        [t('available.group_available', { user: `${teamline.users[0].firstname} ${teamline.users[0].lastname}` }),
        t('available.group_unavailable', { user: `${teamline.users[1].firstname} ${teamline.users[1].lastname}` })],
        [t('available.group_available', { user: `${teamline.users[0].firstname} ${teamline.users[0].lastname}` }),
        t('available.group_available', { user: `${teamline.users[1].firstname} ${teamline.users[1].lastname}` })],
      ];
      let j = 0;
      app.get('/chat.postMessage', (request, response, next) => {
        const msg = request.query;
        const exp = expected[j++];
        for (const e of exp) {
          expect(msg.text).to.include(e);
        }

        if (j == 2) {
          app._router.stack.length -= 4;
          next();
          done();
        }
      });

      bot.inject('message', {
        text: `available (${bot.users[0].name},${bot.users[1].name}) 9:00`,
        mention: true,
      });

      bot.inject('message', {
        text: `available (${bot.users[0].name},${bot.users[1].name}) 15:00`,
        mention: true,
      });
    });
  });

  after(cleanup);
});

const almostEqual = (d1, d2) => expect(Math.abs(moment(d1).diff(d2, 'seconds'))).to.be.lt(60);
