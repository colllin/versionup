// Future = Npm.require('fibers/future');

Meteor.startup(function () {
    Repos.upsertGithubRepo = function(githubApiRepo) {

        githubApiRepo.github_id = githubApiRepo.id;
        delete githubApiRepo.id;

        // Trim unnecessary owner data.
        if (githubApiRepo.owner) githubApiRepo.owner = _(githubApiRepo.owner).pick('login', 'avatar_url');

        Repos.upsert({github_id: githubApiRepo.github_id}, {
            $set: githubApiRepo
        });
    }
});


Meteor.publish("starred-repos", function() {
    var user = Meteor.users.findOne(this.userId);
    if (!user) return;

    // var async = Future.wrap(function(cb) {
    //     _(user.services.github.starred).each(function(repo_id) {
    //         if (Repos.findOne({github_id: repo_id})) return;
    //
    //         // Fetch repo from Github API
    //         var response = HTTP.get(GitHubApi.url + '/users/:username/starred'.replace(':username', user.services.github.username) + '?per_page=100&page=' + nextPage, {
    //             headers: GitHubApi.headers,
    //             params: GitHubApi.params
    //         });
    //         starred = starred.concat(_(response.data).pluck('id'));
    //
    //         // Repos.insert()
    //         console.log('need to fetch repo '+repo_id);
    //     });
    //     cb(null, 'message goes here');
    // });
    //
    // // var fut = new Future();
    // // var bound_callback = Meteor.bindEnvironment(function (err, res) {
    // //     if(err) {
    // //         fut.throw(err);
    // //     }  else {
    // //         fut.return(res)
    // //     }
    // // });
    // // async(bound_callback);
    // // fut.wait();
    // async().wait();

    return [
        Repos.find({
            github_id: {$in: user.services.github.starred}
        }),
        Releases.find({
            repo_github_id: {$in: user.services.github.starred}
        }),
        Tags.find({
            repo_github_id: {$in: user.services.github.starred}
        })
    ];
});
