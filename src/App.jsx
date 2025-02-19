import React, { useState, useEffect } from 'react';
import { AlertCircle, Folder, FileText, ExternalLink, Home, ChevronRight } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const RepoViewer = () => {
  const [content, setContent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasGitHubPages, setHasGitHubPages] = useState(false);
  const [readmeContent, setReadmeContent] = useState('');
  const [repoInfo, setRepoInfo] = useState(null);

  // Parse GitHub URL or use query parameters
  const parseGitHubPath = (url) => {
    // Handle full GitHub URLs
    if (url.includes('github.com')) {
      const urlParts = url.split('github.com/')[1].split('/');
      return {
        username: urlParts[0],
        repository: urlParts[1],
        folder: urlParts.slice(3).join('/')
      };
    }
    // Handle query parameters
    const params = new URLSearchParams(window.location.search);
    return {
      username: params.get('username'),
      repository: params.get('repository'),
      folder: params.get('folder') || ''
    };
  };

  const [inputUrl, setInputUrl] = useState('');
  const [currentPath, setCurrentPath] = useState({
    username: '',
    repository: '',
    folder: ''
  });

  const handleUrlSubmit = (e) => {
    e.preventDefault();
    const parsed = parseGitHubPath(inputUrl);
    setCurrentPath(parsed);
    const newUrl = `?username=${parsed.username}&repository=${parsed.repository}${parsed.folder ? `&folder=${parsed.folder}` : ''}`;
    window.history.pushState({}, '', newUrl);
    fetchRepositoryContent(parsed);
  };

  const fetchRepositoryContent = async (pathInfo) => {
    setLoading(true);
    setError(null);
    try {
      const { username, repository, folder } = pathInfo;

      if (!username || !repository) {
        throw new Error('Please provide both repository owner and name');
      }

      // Fetch repository info
      const repoResponse = await fetch(`https://api.github.com/repos/${username}/${repository}`);
      if (!repoResponse.ok) {
        throw new Error('Repository not found');
      }
      const repoData = await repoResponse.json();
      setRepoInfo(repoData);

      // Check for GitHub Pages
      const pagesResponse = await fetch(`https://api.github.com/repos/${username}/${repository}/pages`);
      setHasGitHubPages(pagesResponse.ok);

      // Fetch contents
      const contentsPath = folder ? `/contents/${folder}` : '/contents';
      const response = await fetch(
        `https://api.github.com/repos/${username}/${repository}${contentsPath}`
      );

      if (!response.ok) {
        throw new Error('Failed to fetch repository content');
      }

      const data = await response.json();
      setContent(Array.isArray(data) ? data : [data]);

      // Try to fetch README.md
      const readme = Array.isArray(data) ? data.find(file => 
        file.name.toLowerCase() === 'readme.md'
      ) : null;
      
      if (readme) {
        const readmeResponse = await fetch(readme.download_url);
        const readmeText = await readmeResponse.text();
        setReadmeContent(readmeText);
      } else {
        setReadmeContent('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.has('username') || params.has('repository')) {
      const pathInfo = parseGitHubPath(window.location.search);
      setCurrentPath(pathInfo);
      fetchRepositoryContent(pathInfo);
    }
  }, []);

  const renderBreadcrumbs = () => {
    if (!currentPath.username) return null;
    
    const parts = [
      { name: currentPath.username, path: `?username=${currentPath.username}` },
      { name: currentPath.repository, path: `?username=${currentPath.username}&repository=${currentPath.repository}` },
      ...(currentPath.folder ? currentPath.folder.split('/').map((part, index, array) => ({
        name: part,
        path: `?username=${currentPath.username}&repository=${currentPath.repository}&folder=${array.slice(0, index + 1).join('/')}`
      })) : [])
    ];

    return (
      <div className="flex items-center space-x-2 mb-4 text-sm">
        <Home className="h-4 w-4" />
        {parts.map((part, index) => (
          <React.Fragment key={index}>
            <ChevronRight className="h-4 w-4" />
            <a 
              href={part.path}
              className="hover:text-blue-600"
            >
              {part.name}
            </a>
          </React.Fragment>
        ))}
      </div>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-8">
      <form onSubmit={handleUrlSubmit} className="mb-8">
        <div className="flex gap-4">
          <input
            type="text"
            value={inputUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            placeholder="Enter GitHub repository URL or path (e.g., username/repository or full GitHub URL)"
            className="flex-1 p-2 border rounded"
          />
          <button 
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            View Repository
          </button>
        </div>
      </form>

      {loading ? (
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : (
        <>
          {renderBreadcrumbs()}

          {hasGitHubPages && (
            <Alert className="mb-6">
              <AlertTitle>GitHub Pages Available</AlertTitle>
              <AlertDescription>
                This repository has an official GitHub Pages site.
                <button 
                  onClick={() => window.open(`https://${currentPath.username}.github.io/${currentPath.repository}`, '_blank')}
                  className="ml-2 text-blue-600 hover:text-blue-800 inline-flex items-center"
                >
                  View official site <ExternalLink className="ml-1 h-4 w-4" />
                </button>
              </AlertDescription>
            </Alert>
          )}

          {repoInfo && (
            <div className="mb-6 p-4 bg-white rounded-lg shadow">
              <h1 className="text-2xl font-bold mb-2">{repoInfo.name}</h1>
              <p className="text-gray-600">{repoInfo.description}</p>
            </div>
          )}

          {readmeContent && (
            <div className="mb-8 p-6 bg-white rounded-lg shadow">
              <h2 className="text-2xl font-bold mb-4">README.md</h2>
              <div className="prose">
                {readmeContent}
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg shadow">
            <div className="border-b p-4">
              <h2 className="text-xl font-semibold">Repository Contents</h2>
            </div>
            <div className="divide-y">
              {content.map((item) => (
                <div key={item.path} className="p-4 hover:bg-gray-50">
                  <a
                    href={item.type === 'dir' 
                      ? `?username=${currentPath.username}&repository=${currentPath.repository}&folder=${item.path}`
                      : item.html_url}
                    className="flex items-center text-gray-700 hover:text-blue-600"
                    target={item.type === 'dir' ? '_self' : '_blank'}
                    rel="noopener noreferrer"
                  >
                    {item.type === 'dir' ? (
                      <Folder className="h-5 w-5 mr-2 text-blue-500" />
                    ) : (
                      <FileText className="h-5 w-5 mr-2 text-gray-500" />
                    )}
                    <span>{item.name}</span>
                  </a>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default RepoViewer;
