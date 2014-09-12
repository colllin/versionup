Session.setDefault("projectQuery", {
  username: '',
  slug: ''
});

Template.projectFinder.helpers({
    projectUsername: function() {
        return Session.get('projectQuery').username;
    },
    projectSlug: function() {
        return Session.get('projectQuery').slug;
    },
    loading: function() {
        return Session.get('project') && Session.get('project')._loading;
    }
});
Template.projectFinder.events({
    'keyup [name="username"], change [name="username"], paste [name="username"], input [name="username"], textInput [name="username"]': function(event, template) {
        // increment the counter when button is clicked
        Session.set('projectQuery', _.extend({}, Session.get('projectQuery'), {
            username: template.$('[name="username"]').val()
        }));
    },
    'keyup [name="slug"], change [name="slug"], paste [name="slug"], input [name="slug"], textInput [name="slug"]': function(event, template) {
        // increment the counter when button is clicked
        Session.set('projectQuery', _.extend({}, Session.get('projectQuery'), {
            slug: template.$('[name="slug"]').val()
        }));
    }
});
