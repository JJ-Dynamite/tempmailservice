use axum::{
    routing::{get, post, delete},
    Router, Json, extract::{Path, State},
    response::IntoResponse,
};
use serde::{Deserialize, Serialize};
use tower_http::cors::{CorsLayer, Any};
use tracing_subscriber;
use std::sync::Arc;
use tokio::sync::RwLock;
use std::collections::HashMap;
use uuid::Uuid;
use chrono::{Utc, DateTime, Duration};

#[derive(Clone)]
struct AppState {
    emails: Arc<RwLock<HashMap<String, EmailBox>>>,
}

#[derive(Clone, Serialize, Deserialize)]
struct EmailBox {
    id: String,
    address: String,
    created_at: DateTime<Utc>,
    expires_at: DateTime<Utc>,
    messages: Vec<EmailMessage>,
}

#[derive(Clone, Serialize, Deserialize)]
struct EmailMessage {
    id: String,
    from: String,
    subject: String,
    body: String,
    received_at: DateTime<Utc>,
}

#[derive(Deserialize)]
struct CreateEmailRequest {
    domain: Option<String>,
}

#[derive(Serialize)]
struct ApiResponse<T: Serialize> {
    success: bool,
    data: Option<T>,
    error: Option<String>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: String,
    service: String,
    version: String,
}

async fn health_check() -> impl IntoResponse {
    Json(HealthResponse {
        status: "healthy".to_string(),
        service: "TempMail Service".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

async fn root() -> impl IntoResponse {
    Json(serde_json::json!({
        "service": "TempMail Service",
        "version": env!("CARGO_PKG_VERSION"),
        "endpoints": {
            "POST /email": "Create temporary email",
            "GET /email/:id": "Get email inbox",
            "GET /email/:id/messages": "Get all messages",
            "DELETE /email/:id": "Delete email box",
            "GET /health": "Health check"
        }
    }))
}

async fn create_email(
    State(state): State<AppState>,
    Json(req): Json<CreateEmailRequest>,
) -> impl IntoResponse {
    let id = Uuid::new_v4().to_string();
    let domain = req.domain.unwrap_or_else(|| "tempmail.dev".to_string());
    let address = format!("{}@{}", &id[..8], domain);
    
    let email_box = EmailBox {
        id: id.clone(),
        address: address.clone(),
        created_at: Utc::now(),
        expires_at: Utc::now() + Duration::hours(24),
        messages: vec![],
    };

    state.emails.write().await.insert(id.clone(), email_box.clone());

    Json(ApiResponse {
        success: true,
        data: Some(email_box),
        error: None,
    })
}

async fn get_email(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let emails = state.emails.read().await;
    
    match emails.get(&id) {
        Some(email) => Json(ApiResponse {
            success: true,
            data: Some(email.clone()),
            error: None,
        }),
        None => Json(ApiResponse {
            success: false,
            data: None,
            error: Some("Email box not found".to_string()),
        }),
    }
}

async fn delete_email(
    State(state): State<AppState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    state.emails.write().await.remove(&id);
    
    Json(ApiResponse::<()> {
        success: true,
        data: None,
        error: None,
    })
}

#[tokio::main]
async fn main() {
    tracing_subscriber::fmt::init();

    let state = AppState {
        emails: Arc::new(RwLock::new(HashMap::new())),
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .route("/", get(root))
        .route("/health", get(health_check))
        .route("/email", post(create_email))
        .route("/email/:id", get(get_email).delete(delete_email))
        .with_state(state)
        .layer(cors);

    let listener = tokio::net::TcpListener::bind("0.0.0.0:3001")
        .await
        .unwrap();

    tracing::info!("TempMail Service backend running on port 3001");
    axum::serve(listener, app).await.unwrap();
}
