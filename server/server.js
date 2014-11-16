GitHubApi = {
    url: 'https://api.github.com',
    headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'versionup'
    },
    conditionalHeaders: function(eTag) {
        return _.extend({}, GitHubApi.headers, {
            'If-None-Match': eTag
        });
    },
    params: {
        client_id: 'e4f0650f60387d1b4f64',
        client_secret: '1ba9d4fc9c5649b764998d78aeed0d329a3eb7d6'
    }
};


Meteor.startup(function () {
    // code to run on server at startup
});


var fetchUpdatedStarredRepos = function(user) {
    var starred = [];
    var nextPage = 1;

    while(nextPage) {
        // Conditional request for first page.
        var response = HTTP.get(GitHubApi.url + '/users/:username/starred'.replace(':username', user.services.github.username) + '?per_page=100&page=' + nextPage, {
            headers: nextPage == 1 && user.services.github.starred_etag ? GitHubApi.conditionalHeaders(user.services.github.starred_etag) : GitHubApi.headers,
            params: GitHubApi.params
        });

        if (nextPage == 1) {
            // If user stars haven't changed, abort early, returning `undefined`.
            // Otherwise persist the updated eTag and continue fetching the starred repos.
            if (response.statusCode == 304) {
                return;
            } else {
                user.services.github.starred_etag = response.headers.etag;
                Meteor.users.update(user._id, {
                    $set: {
                        'services.github.starred_etag': user.services.github.starred_etag
                    }
                });
            }
        }

        starred = starred.concat(response.data);

        var links = ParseLinkHeader(response.headers.link);
        nextPage = links.next ? links.next.page : false;
    }

    return starred;
};

// Result:
// - users starred list is up-to-date `user.services.github.starred = ['<github_id>', '<github_id>', ...]`
// - all starred repos exist in the Repos collection `starredRepo = Repos.findOne({github_id: '<github_id>'})`
var syncUserStars = function(user) {
    var starred = fetchUpdatedStarredRepos(user);

    if (!starred) return;

    Meteor.users.update(user._id, {
        $set: {
            'services.github.starred': _(starred).pluck('id')
        }
    });

    // FIXME: Be more efficient.  No need to upsert EVERY returned repo.  Just insert the ones that don't already exist.
    _(starred).each(Repos.upsertGithubRepo);

    return starred;
};

// Result:
// -
// -
var syncRepoReleases = function(repo) {
    var tagsResponse = HTTP.get(GitHubApi.url + '/repos/:owner/:repo/tags'.replace(':owner/:repo', repo.full_name), {
        headers: GitHubApi.conditionalHeaders(repo.tags_etag),
        params: GitHubApi.params
    });
    // If repo tags aren't modified, skip this part.
    // Otherwise persist the updated eTag and continue updating the repo tags.
    if (tagsResponse.statusCode != 304) {
        repo.tags_etag = tagsResponse.headers.etag;
        Repos.update({github_id: repo.github_id}, {
            $set: {
                'tags_etag': repo.tags_etag
            }
        });

        _(tagsResponse.data).each(function(tagData) {
            if (Tags.findOne({repo_github_id: repo.github_id, name: tagData.name})) return;

            // Fetch and attach date from the commit associated with the tag. Gosh this is hard work.
            var commitResponse = HTTP.get(GitHubApi.url + '/repos/:owner/:repo/commits/:sha'.replace(':owner/:repo', repo.full_name).replace(':sha', tagData.commit.sha), {
                headers: GitHubApi.headers,
                params: GitHubApi.params
            });
            _.extend(tagData, {
                repo_github_id: repo.github_id,
                date: commitResponse.data.commit.committer.date
            });

            Tags.insert(tagData);
        });
    }


    var releasesResponse = HTTP.get(GitHubApi.url + '/repos/:owner/:repo/releases'.replace(':owner/:repo', repo.full_name), {
        headers: GitHubApi.conditionalHeaders(repo.releases_etag),
        params: GitHubApi.params
    });
    // If repo releases aren't modified, skip this part.
    // Otherwise persist the updated eTag and continue updating the repo releases.
    if (releasesResponse.statusCode != 304) {
        repo.releases_etag = releasesResponse.headers.etag;
        Repos.update({github_id: repo.github_id}, {
            $set: {
                'releases_etag': repo.releases_etag
            }
        });

        _(releasesResponse.data).each(function(releaseData) {
            // if (Releases.findOne({github_id: releaseData.id})) return;

            releaseData.github_id = releaseData.id;
            delete releaseData.id;

            releaseData.repo_github_id = repo.github_id;

            // Trim unnecessary author data.
            if (releaseData.author) releaseData.author = _(releaseData.author).pick('login', 'avatar_url');

            _(releaseData.assets).each(function(asset) {
                delete asset.uploader;
            });

            Releases.upsert({github_id: releaseData.github_id}, releaseData);
        });
    }
};

// Sync ALL the data that the user cares about being up-to-date.
var syncAllForUser = function(user) {
    var starredRepos = syncUserStars(user);

    if (!starredRepos) return;

    _(starredRepos).each(syncRepoReleases);
}


// Update the user's starred repos upon login.
Accounts.onLogin(function(attempt) {
    setTimeout(_.partial(Meteor.bindEnvironment(syncAllForUser), attempt.user));
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
