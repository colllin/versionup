Meteor.publish('userData', function() {
    return Meteor.users.find(this.userId, {
        fields: {
            services: 1
        }
    });
});
