Meteor.publish('userData', function() {
    return Meteor.users.find(this.userId, {
        fields: {
            services: 1
        }
    });
});

// MyCollection.hookOptions.after.update = {fetchPrevious: false};
// Meteor.users.after.update(function(userId, doc, fieldNames, modifier, options) {
// });
