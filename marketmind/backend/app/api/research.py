import uuid

from fastapi import APIRouter, Depends, HTTPException, status

from app.api.dependencies import CurrentUser, get_current_user, get_llm, get_retrieval
from app.research.schema import ResearchRequest, ResearchResponse
from app.research.service import ResearchService
from app.services.llm_service import LLMService
from app.services.retrieval_service import RetrievalService

router = APIRouter(prefix="/research", tags=["research"])


@router.post("", response_model=ResearchResponse)
async def research(
    body: ResearchRequest,
    llm: LLMService = Depends(get_llm),
    retrieval: RetrievalService = Depends(get_retrieval),
) -> ResearchResponse:
    query = body.query.strip()
    if not query:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query must not be empty.",
        )
    svc = ResearchService(llm=llm, retrieval=retrieval)
    planned = await svc.plan(query)       # expanded query — used for embedding only
    results = await svc.retrieve(planned)
    reranked = svc.rerank(query, results) # original query — used for keyword overlap
    return await svc.synthesize(query, reranked)


# Sprint 4 stubs
@router.post("/query")
async def submit_query(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")


@router.get("/sessions")
async def list_sessions(user: CurrentUser = Depends(get_current_user)) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")


@router.get("/sessions/{session_id}")
async def get_session(
    session_id: uuid.UUID,
    user: CurrentUser = Depends(get_current_user),
) -> dict:
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Implemented in Sprint 4")
