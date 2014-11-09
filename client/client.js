Session.setDefault('projectQuery', {
    owner: '',
    repo: ''
});
Session.setDefault('projectQueryResult', {});


Template.registerHelper('loggedIn', function() {
    return !!Meteor.user();
});
Template.registerHelper('loggedOut', function() {
    return !Meteor.user();
});
Template.registerHelper('loggingIn', function() {
    return !!Meteor.loggingIn();
});



Template.manage.helpers({
    starred: function() {
        if (!_(Meteor.user()).chain().result('services').result('github').result('starred').value()) return;

        return Repos.find({
            github_id: {$in: Meteor.user().services.github.starred}
        });
    }
});



Template.projectFinder.created = function() {
    this._queryResults = [];
    this._query = _.debounce(function(projectQuery) {
        var query = {
            owner: projectQuery.owner,
            repo: projectQuery.repo
        };

        var result = _(this._queryResults).findWhere(query);

        if (!result || projectQuery._refresh) {
            query._loading = true;
            this._queryResults.push(query);
            Meteor.call('getRepo', query.owner, query.repo, function(error, result) {
                query._loading = false;

                if (error) {
                    query._error = error;
                    return;
                }

                query._result = result;

                if (Session.get('projectQuery').owner == query.owner && Session.get('projectQuery').repo == query.repo) {
                    Session.set('project', _.extend(query, query._result));
                }
            });
        }

        Session.set('project', _.extend(query, query._result));
    }, 500);
    this._queryTracker = Tracker.autorun(_.bind(function() {
        if (!Session.get('projectQuery').owner || !Session.get('projectQuery').repo) return;
        this._query(Session.get('projectQuery'));
    }, this));
};
Template.projectFinder.destroyed = function() {
    this._queryTracker.stop();
};
Template.projectFinder.helpers({
    projectUsername: function() {
        return Session.get('projectQuery').owner;
    },
    projectSlug: function() {
        return Session.get('projectQuery').repo;
    },
    loading: function() {
        return Session.get('project') && Session.get('project')._loading;
    },
    project: function() {
        return JSON.stringify(Session.get('project'));
    }
});
Template.projectFinder.events({
    'keyup [name="owner"], change [name="owner"], paste [name="owner"], input [name="owner"], textInput [name="owner"]': function(event, template) {
        var owner = template.$('[name="owner"]').val();

        if (/\//.test(owner)) {
            template.$('[name="repo"]')[0].focus();
            owner = owner.replace(/\//, '');
        }
        Session.set('projectQuery', _.extend({}, Session.get('projectQuery'), {
            owner: owner
        }));
    },
    'keyup [name="repo"], change [name="repo"], paste [name="repo"], input [name="repo"], textInput [name="repo"]': function(event, template) {
        Session.set('projectQuery', _.extend({}, Session.get('projectQuery'), {
            repo: template.$('[name="repo"]').val()
        }));
    },
    'click .js-refresh-project': function() {
        Session.set('projectQuery', _.extend({}, Session.get('projectQuery'), {
            _refresh: true
        }));
    }
});
