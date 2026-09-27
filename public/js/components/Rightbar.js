const newsData = [
    {
        id: 1,
        category: "First Feature",
        title: "Engage with Feed, Share posts, Follow People",
        description: "Experience learning and sharing with people who share your interests. Fully manage your Feed, and connect with people to see their feed at firsthand.....",
        color: "#667eea"
    },
    {
        id: 2,
        category: "Second Feature",
        title: "Chat in real-time",
        description: "Text people or send them images, videos, and files in real-time and create groups and stay connected togather.",
        color: "#764ba2"
    },
    {
        id: 3,
        category: "Profile and Settings",
        title: "Entire account Management",
        description: "Profile management and settings are available in real time to achieve desired results. Plus analytics section to track your account growth.",
        color: "#667eea"
    },

];

export function Rightbar() {
    return `
        <div class="card border-0 shadow-sm rounded-3 overflow-hidden w-100 news-card">
            
            <!-- News Header -->
            <div class="news-header position-relative p-3">
                <div class="d-flex align-items-center gap-3">
                    <div class="news-icon-header">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                            <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
                            <path d="M18 14h-8"/>
                            <path d="M15 18h-5"/>
                            <path d="M10 6h8v4h-8V6Z"/>
                        </svg>
                    </div>
                    <div>
                        <h6 class="fw-bold mb-0">Platform News</h6>
                        <small class="text-muted">Latest updates & features</small>
                    </div>
                </div>
            </div>

            <!-- News Items Container -->
            <div class="news-container">
                ${newsData.map(news => `
                    <div class="news-item p-3 border-bottom position-relative" data-news-id="${news.id}">
                        <!-- Category Badge -->
                        <div class="mb-2">
                            <span class="badge rounded-pill px-2 py-1" 
                                style="background: linear-gradient(135deg, ${news.color}, ${news.color}dd); font-size: 0.7rem;">
                                ${news.category}
                            </span>
                        </div>

                        <!-- News Content -->
                        <h6 class="news-title fw-semibold mb-2 lh-sm">${news.title}</h6>
                        <p class="news-description text-muted small mb-0 lh-sm">${news.description}</p>

                        <!-- Hover Accent -->
                        <div class="news-accent"></div>
                    </div>
                `).join('')}
            </div>

        </div>
    `;
}