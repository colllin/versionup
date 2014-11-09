Future = Npm.require('fibers/future');

Meteor.startup(function () {
    Repos.upsertGithubRepo = function(githubApiRepo) {
        githubApiRepo.github_id = githubApiRepo.id;
        delete githubApiRepo.id;
        Repos.upsert({github_id: githubApiRepo.github_id}, githubApiRepo);
        //
        // // Fetch repo from Github API
        // var response = HTTP.get(GitHubApi.url + '/repos/:owner/:repo'.replace(':owner', githubRepo.owner).replace(':repo', githubRepo.name), {
        //     headers: GitHubApi.headers,
        //     params: GitHubApi.params
        // });
        // Repos.insert(reponse.data);
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

    return Repos.find({
        github_id: {$in: user.services.github.starred}
    });
});
