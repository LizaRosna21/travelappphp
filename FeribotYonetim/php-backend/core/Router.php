<?php
/**
 * Basit PHP Router - API isteklerini yönlendirir
 */

class Router {
    private array $routes = [];
    private array $middleware = [];
    private string $prefix = '';

    public function group(string $prefix, callable $callback): void {
        $prevPrefix = $this->prefix;
        $this->prefix .= $prefix;
        $callback($this);
        $this->prefix = $prevPrefix;
    }

    public function get(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('GET', $path, $handler, $middleware);
    }

    public function post(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('POST', $path, $handler, $middleware);
    }

    public function put(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('PUT', $path, $handler, $middleware);
    }

    public function delete(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('DELETE', $path, $handler, $middleware);
    }

    public function patch(string $path, callable $handler, array $middleware = []): void {
        $this->addRoute('PATCH', $path, $handler, $middleware);
    }

    private function addRoute(string $method, string $path, callable $handler, array $middleware): void {
        $fullPath = $this->prefix . $path;
        $this->routes[] = [
            'method' => $method,
            'path' => $fullPath,
            'handler' => $handler,
            'middleware' => $middleware,
        ];
    }

    public function resolve(string $method, string $uri): void {
        // Remove query string
        $uri = strtok($uri, '?');
        $uri = rtrim($uri, '/');
        if ($uri === '') $uri = '/';

        foreach ($this->routes as $route) {
            if ($route['method'] !== $method) continue;

            $pattern = $this->pathToRegex($route['path']);
            if (preg_match($pattern, $uri, $matches)) {
                // Extract named params
                $params = array_filter($matches, fn($key) => !is_numeric($key), ARRAY_FILTER_USE_KEY);

                // Run middleware
                foreach ($route['middleware'] as $mw) {
                    $result = $mw($params);
                    if ($result === false) return;
                }

                // Run handler
                ($route['handler'])($params);
                return;
            }
        }

        // 404
        http_response_code(404);
        echo json_encode([
            'error' => true,
            'message' => 'Endpoint bulunamadı',
            'path' => $uri,
            'method' => $method,
        ]);
    }

    private function pathToRegex(string $path): string {
        // Convert :param to named capture group
        $pattern = preg_replace('/\/:([a-zA-Z_]+)/', '/(?P<$1>[^/]+)', $path);
        return '#^' . $pattern . '$#';
    }
}
