GitHubApi = {
    url: 'https://api.github.com',
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'versionup'
    },
    params: {
        client_id: 'e4f0650f60387d1b4f64',
        client_secret: '1ba9d4fc9c5649b764998d78aeed0d329a3eb7d6'
    }
};


Meteor.startup(function () {
    // code to run on server at startup
});


// Update the user's starred repos upon login.
Accounts.onLogin(function(attempt) {
    // console.log(attempt);
    // console.log(this.userId);
    // var user = Meteor.users.findOne(attempt.user._id);
    var starred = [];

    var nextPage = 1;
    while(nextPage) {
        var response = HTTP.get(GitHubApi.url + '/users/:username/starred'.replace(':username', attempt.user.services.github.username) + '?per_page=100&page=' + nextPage, {
            headers: GitHubApi.headers,
            params: GitHubApi.params
        });
        starred = starred.concat(response.data);

        var links = ParseLinkHeader(response.headers.link);
        nextPage = links.next ? links.next.page : false;
    }

    Meteor.users.update(attempt.user._id, {
        $set: {
            'services.github.starred': _(starred).pluck('id')
        }
    });

    // FIXME: Be more efficient.  No need to upsert EVERY returned repo.  Just insert the ones that don't already exist.
    _(starred).each(Repos.upsertGithubRepo);
});


Meteor.methods({
    getRepo: function(owner, repo) {
        // Allows subsequent methods from this client to begin running in a new fiber.
        this.unblock();

        var response = HTTP.get(GitHubApi.url + '/repos/:owner/:repo'.replace(':owner', owner).replace(':repo', repo), {
            headers: GitHubApi.headers,
            params: GitHubApi.params
        });
        return response.data;
    },
    searchUsers: function(query) {
        // Allows subsequent methods from this client to begin running in a new fiber.
        this.unblock();

        var response = HTTP.get(GitHubApi.url + '/search/users', {
            headers: GitHubApi.headers,
            params: GitHubApi.params,
            query: encodeURIComponent(query + ' in:username')
        });
        return response.data;
    },
    searchRepos: function(query) {
        // Allows subsequent methods from this client to begin running in a new fiber.
        this.unblock();

        var response = HTTP.get(GitHubApi.url + '/search/repositories', {
            headers: GitHubApi.headers,
            params: GitHubApi.params,
            query: encodeURIComponent(query + ' in:username&sort=stars')
        });
        return response.data;
    }
});
