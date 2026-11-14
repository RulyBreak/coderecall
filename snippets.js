// Source: Feishu data structures notes, revision 2062.
window.CODE_SNIPPETS = [
  {
    "id": "exercise-01",
    "title": "Sequential List Structure",
    "chapter": "Linear Lists",
    "description": "Reproduce the sequential list structure implementation from memory.",
    "language": "C",
    "sourceOrder": 1,
    "code": "#define LIST_INIT_SIZE 100\n#define LISTINCREMENT 10\ntypedef struct { \n    ElemType *elem; // 存储空间基址 \n    int length; // 当前长度 \n    int listsize; // 当前分配的存储容量 \n    // (以 sizeof(ElemType)为单位) \n} SqList; // 俗称 顺序表\n"
  },
  {
    "id": "exercise-02",
    "title": "Initialize Sequential List",
    "chapter": "Linear Lists",
    "description": "Reproduce the initialize sequential list implementation from memory.",
    "language": "C",
    "sourceOrder": 2,
    "code": "Status InitList_Sq(SqList &L) {\n    L.elem = (ElemType *)malloc(LIST_INIT_SIZE *sizeof(ElemType)); \n    if(!L.elem) return(OVERFLOW); \n    L.length = 0; \n    L.listsize = LIST_INIT_SIZE; \n    return OK;\n} // InitList_Sq\n算法时间复杂度：O(1)\n"
  },
  {
    "id": "exercise-03",
    "title": "Get Sequential List Element",
    "chapter": "Linear Lists",
    "description": "Reproduce the get sequential list element implementation from memory.",
    "language": "C",
    "sourceOrder": 3,
    "code": "Status GetElem_Sq(SqList L, int i, ElemType &e) { \n    if (i < 1 || i > L.length) return ERROR;// 位序不合法 \n    e = L.elem[i-1]; // 数组下标 i-1 对应位序 i \n    return OK; \n} \n算法时间复杂度：O(1)\n"
  },
  {
    "id": "exercise-04",
    "title": "Locate Sequential List Element",
    "chapter": "Linear Lists",
    "description": "Reproduce the locate sequential list element implementation from memory.",
    "language": "C",
    "sourceOrder": 4,
    "code": "int LocateElem_Sq(SqList L, ElemType e){ \n    // 在顺序表中查询第一个满足判定条件的数据元素，\n    // 若存在，则返回它的位序，否则返回 0\n    int i = 0; // i 的初值为第 1 元素的位序 \n    while (i <= L.length-1 && L.elem[i]!=e) \n        ++i; \n    if (i <= L.length-1) return i+1; // 找到满足条件的元素 \n    else return 0; // 没有找到满足条件的元素 \n} // LocateElem_Sq \n算法时间复杂度：O(ListLength(L))=O(n)\n"
  },
  {
    "id": "exercise-05",
    "title": "Insert into Sequential List",
    "chapter": "Linear Lists",
    "description": "Reproduce the insert into sequential list implementation from memory.",
    "language": "C",
    "sourceOrder": 5,
    "code": "Status ListInsert_Sq(SqList &L, int i, ElemType e) {  \n    if (i < 1 || i > L.length+1)  //i 的合法范围为 1≤i≤L.length+1 \n        return ERROR; // 插入位置不合法\n    if (L.length >= L.listsize) { \n        ElemType *newbase=(ElemType *)realloc(L.elem, (L.listsize + LISTINCREMENT)*sizeof(ElemType));  // 当前存储空间已满 增加分配 \n        if(!newbase) exit(OVERFLOW); \n        L.elem=newbase; \n        L.listsize += LISTINCREMENT; \n    } \n    for (int j = L.length-1;j >= i-1;--j) \n        L.elem[j+1] = L.elem[j]; // 插入位置及之后的元素右移 \n    L.elem[i-1] = e;  // 插入 e 元素右移 \n    ++L.length; // 表长增 1 \n    return OK; \n} // ListInsert_Sq \n算法时间复杂度为： O(ListLength(L))=O(n)\n"
  },
  {
    "id": "exercise-06",
    "title": "Singly Linked Node Structure",
    "chapter": "Linear Lists",
    "description": "Reproduce the singly linked node structure implementation from memory.",
    "language": "C",
    "sourceOrder": 6,
    "code": "typedef struct LNode { \n    ElemType data; // 数据域 \n    struct LNode *next; // 指针域 \n} LNode, *LinkList;\n"
  },
  {
    "id": "exercise-07",
    "title": "Get Linked List Element",
    "chapter": "Linear Lists",
    "description": "Reproduce the get linked list element implementation from memory.",
    "language": "C",
    "sourceOrder": 7,
    "code": "Status GetElem_L(LinkList L,int i,ElemType &e){ \n// L 是带头结点的链表的头指针，以 e 返回第 i 个元素 \n    p = L->next; // p 指向第一个结点\n    j = 1; // j 为计数器 \n    while (p && j<i) { \n        p = p->next; \n        ++j; \n    }  // 顺指针向后查找，直到 p 指向第 i 个元素, 或 p 为空 \n    if ( !p || j>i ) \n        return ERROR; // 第 i 个元素不存在 \n    e = p->data; // 取得第 i 个元素 \n    return OK; \n} // GetElem_L \n算法时间复杂度：O(ListLength(L))=O(n)\n"
  },
  {
    "id": "exercise-08",
    "title": "Locate Linked List Element",
    "chapter": "Linear Lists",
    "description": "Reproduce the locate linked list element implementation from memory.",
    "language": "C",
    "sourceOrder": 8,
    "code": "int LocateElem_L(LinkList L, ElemType e) { \n    LNode *p = L->next; \n    int j = 1; \n    while (p != NULL && p->data != e) { \n        p = p->next; \n        j++; \n    } \n    if (p != NULL) return j; \n    else return 0; \n} \n算法时间复杂度为：O(n)\n"
  },
  {
    "id": "exercise-09",
    "title": "Insert into Linked List",
    "chapter": "Linear Lists",
    "description": "Reproduce the insert into linked list implementation from memory.",
    "language": "C",
    "sourceOrder": 9,
    "code": "Status ListInsert_L(LinkList L, int i, ElemType e) { \n// L为带头结点的单链表的头指针，本算法在链表中第 i 个结点之前插入新的元素 e \n    p = L; \n    j = 0; \n    while (p && j < i-1) { \n        p = p->next;\n        ++j;\n    }  // 寻找第 i-1 个结点 \n    if (!p || j > i-1)  return ERROR;  // i 大于表长或者小于1\n    s = (LinkList)malloc(sizeof(LNode));  // 生成新结点 \n    if ( s == NULL) return ERROR; \n    s->data = e; \n    s->next = p->next; \n    p->next = s;// 插入 \n    return OK; \n} // LinstInsert_L \n算法的时间复杂度：O(ListLength(L)) =O(n)\n"
  },
  {
    "id": "exercise-10",
    "title": "Delete Linked List Node",
    "chapter": "Linear Lists",
    "description": "Reproduce the delete linked list node implementation from memory.",
    "language": "C",
    "sourceOrder": 10,
    "code": "Status ListDelete_L(LinkList L, int i, ElemType &e) { \n// 删除以 L 为头指针(带头结点)的单链表中第 i 个结点 \n    p = L; \n    j = 0; \n    while (p->next && j < i-1) \n    { p = p->next; ++j;} //寻找第 i 个结点， \n    if (!(p->next) || j > i-1)  //并令 p 指向其前趋 \n        return ERROR; // 删除位置不合理 \n    q = p->next; p->next = q->next;// 删除并释放结点 \n    e = q->data; delete(q); \n    return OK; \n} // ListDelete_L \n算法的时间复杂度为： O(ListLength(L)) =O(n)\n"
  },
  {
    "id": "exercise-11",
    "title": "Create Linked List in Reverse Order",
    "chapter": "Linear Lists",
    "description": "Reproduce the create linked list in reverse order implementation from memory.",
    "language": "C",
    "sourceOrder": 11,
    "code": "void CreateList_L(LinkList &L, int n) { \n// 逆序输入 n 个数据元素，建立带头结点的单链表 \n    L = (LinkList)malloc(sizeof(LNode)); \n    L->next = NULL; // 先建立一个带头结点的空表 \n    for (i = n;i > 0;--i) { \n        p = (LinkList)malloc(sizeof(LNode)); \n        scanf(&p->data);  // 输入元素值 \n        p->next = L->next; \n        L->next = p; // 插入 \n    } \n} // CreateList_L\n"
  },
  {
    "id": "exercise-12",
    "title": "Create Linked List in Input Order",
    "chapter": "Linear Lists",
    "description": "Reproduce the create linked list in input order implementation from memory.",
    "language": "C",
    "sourceOrder": 12,
    "code": "void CreateList_L(LinkList &L,int n){ \n//正位序输入 n 个元素的值，建立带表头结点的单链表 L \n    L=new LNode;  // 头结点 \n    L->next=NULL; \n    r=L; //尾指针 r 指向头结点 \n    for(i=0;i<n;++i){ \n        p=new LNode; //生成新结点 \n        cin>>p->data; //输入元素值 \n        p->next=NULL;r->next=p; //插入到表尾 \n        r=p; //r 指向新的尾结点 \n    } \n}//CreateList_L \n算法的时间复杂度为： O(ListLength(L)) =O(n)\n"
  },
  {
    "id": "exercise-13",
    "title": "Josephus Problem",
    "chapter": "Linear Lists",
    "description": "Reproduce the josephus problem implementation from memory.",
    "language": "C",
    "sourceOrder": 13,
    "code": "void Josephus (int n, int m ) { \n    Firster (); //检验指针指向第一个结点\n    for (int i = 0;i < n-1;i++ ) {  //执行 n-1 次 \n        for (int j = 0;j < m-1;j++ )\n            Next(); //循环 m-1 次使 current 指向被删除结点\n        cout << \"出列的人是\" << GetElem_L () << endl; //出列人员的数据 \n        ListDelete();  //删去每一趟的第 m 结点 \n    }\n}\n"
  },
  {
    "id": "exercise-14",
    "title": "Doubly Linked Node Structure",
    "chapter": "Linear Lists",
    "description": "Reproduce the doubly linked node structure implementation from memory.",
    "language": "C++",
    "sourceOrder": 14,
    "code": "typedef struct DuLNode { \n    ElemType data; // 数据域 \n    struct DuLNode *prior; // 指向前驱的指针域 \n    struct DuLNode *next; // 指向后继的指针域 \n} DuLNode, *DuLinkList;\n\n判空条件： \n头结点的前驱后继都是头结点(L->next == L && L->prior == L) \n任意结点 p 的前驱和后继：(p->prior->next == p，p->next->prior == p)\n"
  },
  {
    "id": "exercise-15",
    "title": "Insert into Doubly Linked List",
    "chapter": "Linear Lists",
    "description": "Reproduce the insert into doubly linked list implementation from memory.",
    "language": "C",
    "sourceOrder": 15,
    "code": "Status DuListInsert_L(DuLinkList L, int i, ElemType e) { \n// L 为带头结点的双向链表的头指针，本算法在链表中第 i 个结点之前插入新的元素 e \n    p = L; \n    j = 0; \n    while (p->next!=L && j < i-1) \n    { p = p->next; ++j;}  // 寻找第 i-1 个结点41 \n    if ( j!= i-1) \n        return ERROR;  // i 大于表长或者小于 1 \n    s = (DuLinkList)malloc(sizeof(DuLNode)); // 生成新结点 \n    if ( s == NULL) \n        return ERROR; \n    s->data = e; s->next=p->next; s->prior=p; \n    p->next ->prior= s; p->next = s; // 插入 \n    return OK; \n} // DuListInsert_L \n算法的时间复杂度为： 未知结点 O(n);已知结点 O(1)\n"
  },
  {
    "id": "exercise-16",
    "title": "Delete Doubly Linked List Node",
    "chapter": "Linear Lists",
    "description": "Reproduce the delete doubly linked list node implementation from memory.",
    "language": "C++",
    "sourceOrder": 16,
    "code": "Status DuListDeletet_L(DuLinkList L, DuLNode *p) { \n// L 为带头结点的双向链表的头指针，本算法在链表中删除 P 结点 \n    if (p == L) \n        return ERROR;// 不能删除头结点 \n    p->prior->next = p->next; \n    p->next->prior = p->prior; \n    free(p); \n    return OK; \n} // DuListDeletet_L \n算法的时间复杂度为： 未知结点 O(n);已知结点 O(1)\n"
  },
  {
    "id": "exercise-17",
    "title": "Merge Linked Lists",
    "chapter": "Linear Lists",
    "description": "Reproduce the merge linked lists implementation from memory.",
    "language": "C",
    "sourceOrder": 17,
    "code": "void MergeList_L(LinkList &La,LinkList &Lb,LinkList &Lc){ \n    pa=La->next; pb=Lb->next; \n    pc=Lc=La;  //用 La 的头结点作为 Lc 的头结点 \n    while(pa && pb){ \n        pc->next=pa?pa:pb;  //插入剩余段 \n        delete Lb; \n        if(pa->data<=pb->data){ pc->next=pa;pc=pa;pa=pa->next;} \n        else{pc->next=pb;pc=pb;pb=pb->next;}\n    } //while\n} //释放 Lb 的头结点 \n\nT(n)=O(m+n)其中 m=ListLength (La)、n = ListLength (Lb) 为 La/Lb 长度\nS(n)= O(1)\n"
  },
  {
    "id": "exercise-18",
    "title": "Merge Linked Lists Without Duplicates",
    "chapter": "Linear Lists",
    "description": "Reproduce the merge linked lists without duplicates implementation from memory.",
    "language": "C",
    "sourceOrder": 18,
    "code": "void MergeList_L(LinkList &La,LinkList &Lb,LinkList &Lc){ \n    pa=La->next; pb=Lb->next; \n    pc=Lc=La;  //用 La 的头结点作为 Lc 的头结点 \n    while(pa && pb){ \n        if(pa->data<=pb->data){ pc->next=pa;pc=pa;pa=pa->next;} \n        else if (pa->data == pb->data){ \n            temp = pb; // 记录重复节点 \n            pb = pb->next; // pb 后移 \n            delete temp; // 释放重复节点 \n        }\n        else{ pc->next=pb; pc=pb; pb=pb->next; } \n    } //while\n    pc->next=pa?pa:pb;   //插入剩余段 \n    delete Lb;//释放 Lb 的头结点\n}\n"
  },
  {
    "id": "exercise-19",
    "title": "Merge Linked Lists in Descending Order",
    "chapter": "Linear Lists",
    "description": "Reproduce the merge linked lists in descending order implementation from memory.",
    "language": "C++",
    "sourceOrder": 19,
    "code": "void MergeList_L_Descending(LinkList &La, LinkList &Lb, LinkList &Lc) { \n    LNode *pa = La->next; \n    LNode *pb = Lb->next; \n    Lc = pc = La; \n    pc->next = NULL; // 初始化 Lc 为仅含头结点的空表(关键步骤) \n    LNode *temp; // 保存待插入节点的后续节点 \n    while (pa && pb) { \n        if (pa->data <= pb->data) { // 取较小节点，头插 \n            temp = pa->next; // 保存 pa 的后续节点，避免 La 断链 \n            pa->next = pc->next; // 新节点的 next 指向原头结点后的节点 \n            pc->next = pa; // 头结点的 next 指向新节点(头插完成) \n            pa = temp; // pa 移动到原后续节点 \n        } \n        else { // 取 pb 节点，头插 \n            temp = pb->next; \n            pb->next = pc->next; \n            pc->next = pb; \n            pb = temp; \n        }\n    } \n    // 剩余节点头插接入 \n    while (pa) { \n        temp = pa->next; \n        pa->next = pc->next; \n        pc->next = pa; \n        pa = temp; \n    } \n    while (pb) { \n        temp = pb->next; \n        pb->next = pc->next; \n        pc->next = pb; \n        pb = temp; \n    } \n    delete Lb; // 释放 Lb 头结点 \n} \n时间复杂度仍为 O (m + n)，空间复杂度 O (1)\n"
  },
  {
    "id": "exercise-20",
    "title": "Sequential Stack Structure",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the sequential stack structure implementation from memory.",
    "language": "C",
    "sourceOrder": 20,
    "code": "#define STACK_INIT_SIZE 100 //栈存储空间初始分配量 \n#define STACKINCREMENT 10 //栈存储空间分配增量 \ntypedef struct { \n    SElemType *base;//栈底指针，构造之前和销毁之后 base=NULL \n    SElemType *top; //栈顶指针，指向位置 \n    int stacksize;//当前已分配的存储空间(元素个数)，以元素为单位。 \n}SqStack;\n"
  },
  {
    "id": "exercise-21",
    "title": "Initialize Sequential Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the initialize sequential stack implementation from memory.",
    "language": "C",
    "sourceOrder": 21,
    "code": "Status InitStack(SqStack &S) { \n    S.base=(SElemType *)malloc(STACK_INIT_SIZE*sizeof(SElemType)); //构造一个空栈 S \n    if(S.base==NULL) \n        return ERROR; // 存储分配失败 \n    S.top=S.base; // 空栈 \n    S.stacksize= STACK_INIT_SIZE;// 初始化容量 \n    return OK; \n}//InitStack;\n"
  },
  {
    "id": "exercise-22",
    "title": "Get Sequential Stack Top",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the get sequential stack top implementation from memory.",
    "language": "C",
    "sourceOrder": 22,
    "code": "Status GetTop( SqStack S,SElemType &e) { \n    if(S.top == S.base) \n        return ERROR;//若栈不空，则用 e 返回栈顶元素，并返回 OK,否则，返回 ERROR; \n    e=*(S.top-1); // top 指向栈顶下一个位置，所以要减 1 \n    return OK; \n} // GetTop;\n"
  },
  {
    "id": "exercise-23",
    "title": "Push onto Sequential Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the push onto sequential stack implementation from memory.",
    "language": "C",
    "sourceOrder": 23,
    "code": "// 核心：先判满，满则扩容，再存元素，最后 top++\nStatus Push(SqStack &S, SElemType e) { //插入元素 e 为新的栈顶 \n    if (S.top-S.base>=S.stacksize) { //栈满判断(top-base == stacksize)，追加存储空间 \n        S.base=(SElemType *)realloc(S.base, (S.stacksize + STACKINCREMENT)*sizeof(SElemType)); \n        if(!S.base) \n            exit(OVERFLOW);//存储分配失败 \n        S.top = S.base +S.stacksize;// 修正 top 指针 \n        S.stacksize+= STACKINCREMENT;//更新栈的总容量 \n    }\n    *S.top++=e;//先存元素,再移动指针 \n    return(OK); \n}//Push\n"
  },
  {
    "id": "exercise-24",
    "title": "Pop from Sequential Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the pop from sequential stack implementation from memory.",
    "language": "C",
    "sourceOrder": 24,
    "code": "// 核心：先判空，再移动 top 指针，再取元素\nStatus Pop(SqStack &S, SElemType &e) { \n    if(S.top == S.base) \n        return (ERROR);//栈空，返回错误 \n    e=*(--S.top);//若栈不空,删除栈顶,用 e 返回值(先移动指针，再取元素) \n    return(OK); \n} //Pop\n"
  },
  {
    "id": "exercise-25",
    "title": "Linked Stack Structure",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the linked stack structure implementation from memory.",
    "language": "C",
    "sourceOrder": 25,
    "code": "typedef struct LNode { \n    ElemType data;  // 数据域 \n    struct LNode *next;  // 指针域 \n} LNode, *LinkList; \n\ntypedef LinkList Lstack;\n"
  },
  {
    "id": "exercise-26",
    "title": "Initialize Linked Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the initialize linked stack implementation from memory.",
    "language": "C",
    "sourceOrder": 26,
    "code": "Status InitStack(Lstack &S) { //构造一个空栈 S \n    S=NULL; \n    return OK; \n}//InitStack;\n"
  },
  {
    "id": "exercise-27",
    "title": "Get Linked Stack Top",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the get linked stack top implementation from memory.",
    "language": "C++",
    "sourceOrder": 27,
    "code": "Status GetTop( Lstack S, ElemType &e) { \n    if (S==NULL) \n        return ERROR;//先判空，若栈不空，则用 e 返回栈顶元素，并返回 OK, 否则，返回 ERROR\n    e=S->data;// 栈顶是表头，直接取数据 \n    return OK; \n} // GetTop;\n"
  },
  {
    "id": "exercise-28",
    "title": "Push onto Linked Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the push onto linked stack implementation from memory.",
    "language": "C",
    "sourceOrder": 28,
    "code": "Status Push(Lstack &S, ElemType e) {    //插入元素 e 为新的栈顶 \n    P=(Lstack *)malloc(sizeof(LNode));// 分配新结点(malloc 的使用) \n    if (P==NULL) exit(OVERFLOW);//存储分配失败 \n    // 头插法的核心步骤 \n    P->data=e;// 存元素 \n    P->next=S;// 新结点指向原栈顶(头插法核心) \n    S=P;// S 指向新结点，成为新栈顶 \n    return(OK); \n}//Push\n"
  },
  {
    "id": "exercise-29",
    "title": "Pop from Linked Stack",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the pop from linked stack implementation from memory.",
    "language": "C",
    "sourceOrder": 29,
    "code": "Status Pop(Lstack &S, ElemType &e) { \n//若栈不空,删除栈顶,用 e 返回值，返回 OK,\n    if( S == NULL) \n        return (ERROR) ;// 判空，栈空不能出栈 \n    e=S->data;// 取栈顶数据 \n    p=S;// 保存原栈顶结点地址59 \n    S=S->next;// 栈顶指针下移 \n    free(p);// 释放原栈顶结点 \n    return(OK); \n} //Pop\n"
  },
  {
    "id": "exercise-30",
    "title": "Linked Queue Structure",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the linked queue structure implementation from memory.",
    "language": "C++",
    "sourceOrder": 30,
    "code": "typedef struct QNode {    // 结点类型 \n    QElemType data; \n    struct QNode *next; \n} QNode, *QueuePtr; \n\ntypedef struct { // 链队列类型 \n    QueuePtr front; // 队头指针 \n    QueuePtr rear; // 队尾指针 \n} LinkQueue;\n"
  },
  {
    "id": "exercise-31",
    "title": "Initialize Linked Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the initialize linked queue implementation from memory.",
    "language": "C",
    "sourceOrder": 31,
    "code": "Status InitQueue (LinkQueue &Q) { \n    Q.front = Q.rear = (QueuePtr *)malloc(sizeof( QNode)); \n    if (!Q.front) exit (OVERFLOW);//存储分配失败 \n    Q.front->next = NULL; \n    return OK; \n}\n"
  },
  {
    "id": "exercise-32",
    "title": "Enqueue Linked Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the enqueue linked queue implementation from memory.",
    "language": "C",
    "sourceOrder": 32,
    "code": "Status EnQueue(LinkQueue &Q, QElemType e) { \n    p = (QueuePtr)malloc(sizeof(QNode));//分配地址空间，与初始化一致; \n    if (!p) \n        exit (OVERFLOW); //存储分配失败 \n    p->data = e; p->next = NULL;//新结点为队尾，next 为空 \n    Q.rear->next = p; \n    Q.rear = p;// 原队尾结点指向新结点,更新队尾指针 \n    return OK; \n}\n"
  },
  {
    "id": "exercise-33",
    "title": "Dequeue Linked Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the dequeue linked queue implementation from memory.",
    "language": "C++",
    "sourceOrder": 33,
    "code": "Status DeQueue (LinkQueue &Q, QElemType &e) { \n// 用 e 返回其值，并返回 OK;否则返回 ERROR \n    if (Q.front == Q.rear) \n        return ERROR;//判空 \n    p = Q.front->next; e = p->data;// p 指向队头结点,取队头数据 \n    Q.front->next = p->next;// 头结点指向新队头 \n    if (Q.rear == p) \n        Q.rear = Q.front;// 若删除后队空，更新 rear \n    free (p);\n    return OK; \n}\n"
  },
  {
    "id": "exercise-34",
    "title": "Circular Queue Structure",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the circular queue structure implementation from memory.",
    "language": "C",
    "sourceOrder": 34,
    "code": "#define MAXQSIZE 100 //最大队列长度 \ntypedef struct { \n    QElemType *base; // 初始化的动态分配存储空间 \n    int front;// 头指针，若队列不空，指向队列头元素 \n    int rear;//尾指针,若队列不空, 指向队列尾元素的下一个位置 \n} SqQueue;\n"
  },
  {
    "id": "exercise-35",
    "title": "Initialize Circular Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the initialize circular queue implementation from memory.",
    "language": "C",
    "sourceOrder": 35,
    "code": "Status InitQueue (SqQueue &Q){\n    Q.base=(QElemType *)malloc(MAXQSIZE*sizeof(QElemType)); \n    if(!Q.base) \n        exit(OVERFLOW);//存储分配失败 \n    Q.front=Q.rear=0;//初始化条件 \n    return OK; \n}\n"
  },
  {
    "id": "exercise-36",
    "title": "Circular Queue Length",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the circular queue length implementation from memory.",
    "language": "C",
    "sourceOrder": 36,
    "code": "int QueueLength(SqQueue Q) { \n    return (Q.rear - Q.front + MAXQSIZE) % MAXQSIZE; //(计算公式务必记牢) \n}\n"
  },
  {
    "id": "exercise-37",
    "title": "Enqueue Circular Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the enqueue circular queue implementation from memory.",
    "language": "Java",
    "sourceOrder": 37,
    "code": "Status EnQueue(SqQueue &Q,QElemType e){ \n// 插入元素 e 为 Q 的新的队尾元素 \n    if ((Q.rear+1) % MAXQSIZE == Q.front) //判满条件 \n        return ERROR; \n    Q.base[Q.rear]=e;// 存入元素 \n    Q.rear = (Q.rear+1)% MAXQSIZE;// 队尾指针后移(环形)，重点 \n    return OK; \n}\n"
  },
  {
    "id": "exercise-38",
    "title": "Dequeue Circular Queue",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the dequeue circular queue implementation from memory.",
    "language": "C",
    "sourceOrder": 38,
    "code": "Status DeQueue(SqQueue &Q, QElemType &e){ \n    //若队列不空，则删除 Q 的队头元素， 用 e 返回其值，并返回 OK; 否则返回 ERROR \n    if(Q.front == Q.rear) return ERROR; \n    e = Q.base[Q.front]; \n    Q.front = (Q.front+1) % MAXQSIZE; \n    return OK; \n}\n"
  },
  {
    "id": "exercise-39",
    "title": "Number Base Conversion",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the number base conversion implementation from memory.",
    "language": "C",
    "sourceOrder": 39,
    "code": "void conversion () { \n    InitStack(S); \n    scanf (\"%d\",N); \n    \n    while (N != 0) { //循环除法 \n        Push(S, N % 8); \n        N = N/8; \n    } \n    while (!StackEmpty(S)) { //栈空判断 \n        Pop(S,e); \n        printf ( \"%d\", e ); \n    } \n} // conversion\n"
  },
  {
    "id": "exercise-40",
    "title": "Bracket Matching",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the bracket matching implementation from memory.",
    "language": "C",
    "sourceOrder": 40,
    "code": "Status match() { \n    InitStack(S); \n    \n    while((c=getchar())!='\\n') { // 读取表达式直到换行符 \n        if(In(c,\"([{\")) \n            Push(S, c);// 判断是否为括号字符，左括号入栈 \n        else if(In(c,\")]}\")) {    // 右括号 \n            if ( StackEmpty(S) ) return(ERROR);// 右括号多余 \n            else { \n                Pop(S,a);// 弹出栈顶左括号 \n                if(!comp(a,c)) return(ERROR);// 括号不匹配 \n            } // else\n        } // else if\n    } // while\n    if(!StackEmpty(S)) return(ERROR);// 左括号多余判断，遍历后判空 \n    else return(OK); \n}// match;\n"
  },
  {
    "id": "exercise-41",
    "title": "Expression Evaluation",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the expression evaluation implementation from memory.",
    "language": "C",
    "sourceOrder": 41,
    "code": "OperandType EvaluateExpression() { \n//设 OPTR, OPND 为运算符栈和操作数栈，OP 为运算符的集合 \n    InitStack(OPTR); \n    Push(OPTR, \"#\");//运算符栈压入起始符# \n    InitStack(OPND); \n    c=getitem();// 读取第一个字符 \n    \n    while( c! = '#' || GetTop(OPTR) != '#' ) {    // 循环条件：未到表达式结束(考点) \n        if (!In(c,OP)) { \n            Push( OPND, c);\n            c=getitem();\n        } \n        //不是运算符则进栈 \n        else \n            switch(precede (GetTop(OPTR), c) ) { \n                case '<'：//栈顶元素优先级低 \n                    Push(OPTR, c), c=getitem(); \n                    break; \n                case '=' ： //脱扩号并接受下一个字符 \n                    Pop(OPTR,x); c=getitem(); \n                    break; \n                case '>'： //栈顶算符优先级高,退栈并将运算结果入栈 \n                    Pop(OPTR,theta); \n                    Pop(OPND,b);Pop(OPND,a);//弹出运算符,弹出 b,弹出 a (考点) \n                    Push(OPND,operate(a, theta, b));break;// 结果入栈 \n            }//switch \n    }//while \n    return(GetTop(OPND)) \n}// EvaluateExpression\n"
  },
  {
    "id": "exercise-42",
    "title": "Tower of Hanoi",
    "chapter": "Stacks & Queues",
    "description": "Reproduce the tower of hanoi implementation from memory.",
    "language": "C",
    "sourceOrder": 42,
    "code": "void hanoi(int n, char x, char y, char z){\n    if(n == 1)\n        move(x, 1, z);    // 将１个圆盘从 x 移到 z\n     else{\n         hanoi(n-1, x, z, y);    // 将 x 上１至 n-1 个圆盘移到 y, z 作辅助塔\n         move(x, n, z);  // 将第 n 个圆盘从 x 移到 z\n         hanoi(n-1, y, x, z); // 将 y 上１至 n-1 个圆盘移到 z, x 作辅助塔\n     }\n}\n"
  },
  {
    "id": "exercise-43",
    "title": "Substring Index",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the substring index implementation from memory.",
    "language": "C",
    "sourceOrder": 43,
    "code": "int Index (String S, String T, int pos) { \n    // T 为非空串。若主串 S 中第 pos 个字符之后存在与 T 相等的子串， \n    // 则返回第一个这样的子串在 S 中的 位置，否则返回 0 \n    if (pos > 0) { \n        n = StrLength(S);  m = StrLength(T);  i = pos; \n        while ( i <= n-m+1) { \n            SubString (sub, S, i, m);\n            if (StrCompare(sub,T) != 0) \n            ++i ; \n            else return i ; //返回子串在主串中的位置 \n        } // while \n    } // if \n    return 0; // S 中不存在与 T 相等的子串 \n} // Index\n"
  },
  {
    "id": "exercise-44",
    "title": "String Replacement",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the string replacement implementation from memory.",
    "language": "C",
    "sourceOrder": 44,
    "code": "void Replace(String& S, String T, String V) { \n    n=StrLength(S); m=StrLength(T); pos = 1; \n    StrAssign(news, NullStr); i = 1; \n    \n    while ( pos <= n-m+1 && i) { \n        i = Index(S, T, pos); \n        if (i!=0) { \n            SubString(sub, S, pos, i-pos);// 不置换子串 \n            Concat(news, news, sub, V); \n            pos = i+m; \n        }//if \n    }//while \n    SubString(sub, S, pos, n-pos+1); // 剩余串 \n    Concat( S, news, sub ); \n} // Replace\n"
  },
  {
    "id": "exercise-45",
    "title": "Fixed-Length String Structure",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the fixed-length string structure implementation from memory.",
    "language": "C",
    "sourceOrder": 45,
    "code": "#define MAXSTRLEN 255  // 用户可在 255 以内定义最大串长 \ntypedef unsigned char Sstring[MAXSTRLEN + 1];  // 0 号单元存放串的长度\n"
  },
  {
    "id": "exercise-46",
    "title": "Concatenate Fixed-Length Strings",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the concatenate fixed-length strings implementation from memory.",
    "language": "C",
    "sourceOrder": 46,
    "code": "Status Concat(SString S1, SString S2, SString &T) { \n    if (S1[0]+S2[0] <= MAXSTRLEN) {// 未截断 \n        T[1..S1[0]] = S1[1..S1[0]]; \n        T[S1[0]+1..S1[0]+S2[0]] = S2[1..S2[0]]; \n        T[0] = S1[0]+S2[0]; uncut = TRUE; \n    } \n    else if (S1[0] <MAXSTRLEN) { // 截断 \n        T[1..S1[0]] = S1[1..S1[0]]; \n        T[S1[0]+1..MAXSTRLEN] = S2[1..MAXSTRLEN－S1[0]]; \n        T[0] = MAXSTRLEN; \n        uncut = FALSE; \n    } \n    else { // 截断(仅取 S1) \n        T[0..MAXSTRLEN] = S1[0..MAXSTRLEN];  // T[0] == S1[0] == MAXSTRLEN \n        uncut = FALSE; \n    }\n    return uncut; \n} // Concat\n"
  },
  {
    "id": "exercise-47",
    "title": "Heap String Structure",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the heap string structure implementation from memory.",
    "language": "C",
    "sourceOrder": 47,
    "code": "typedef struct { \n    char *ch; // 若是非空串，则按串实用长度分配存储区，否则 ch 为 NULL \n    int length; // 串长度 \n} HString;\n"
  },
  {
    "id": "exercise-48",
    "title": "Extract Heap String Substring",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the extract heap string substring implementation from memory.",
    "language": "C",
    "sourceOrder": 48,
    "code": "Status SubString(HString &Sub, HString S, int pos, int len) {  \n    if (pos < 1 || pos > S.length || len < 0 || len > S.length-pos+1) \n        return ERROR; \n    if (Sub.ch) \n        free (Sub.ch); // 释放旧空间 \n    if (!len)  { Sub.ch = NULL; Sub.length = 0;} // 空子串 \n    else { // 完整子串 \n        if(!(Sub.ch = malloc(len *sizeof(char)))) \n            return ERROR; \n        Sub.ch[0..len-1] = S.ch[pos-1..pos+len-2];\n        Sub.length = len; \n    } // 完整子串 \n    return OK; \n} // SubString\n"
  },
  {
    "id": "exercise-49",
    "title": "Chunked String Structure",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the chunked string structure implementation from memory.",
    "language": "C",
    "sourceOrder": 49,
    "code": "#define CHUNKSIZE 4 // 可由用户定义的块大小 \ntypedef struct Chunk { // 结点结构 \n    char ch[CHUNKSIZE];86 \n    struct Chunk *next; \n} Chunk; \ntypedef struct { // 串的链表结构 \n    Chunk *head, *tail;// 串的头和尾指针 \n    int curlen; // 串的当前长度 \n} LString;\n"
  },
  {
    "id": "exercise-50",
    "title": "Brute Force String Matching",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the brute force string matching implementation from memory.",
    "language": "C",
    "sourceOrder": 50,
    "code": "int Index (String S, String T, int pos) { \n//BruteForce (BF)算法// T 为非空串。若主串 S 中第 pos 个字符之后存在与 T 相等的子串，\n// 则返回第一个 这样的子串在 S 中的 位置，否则返回0 \n    i = pos; j=1; \n    \n    while ( i <=S[0] && j<=T[0] ) { \n        if ( S[ i ] == T[ j ] ) { ++i; ++j; } //继续比较后续字符\n        else { i=i-j+2; j=1; } //指针后退，重新开始匹配\n    } // while \n    if(j > T[0])return i - T[0]; \n    else return 0; // S 中不存在与 T 相等的子串\n} // Index\n"
  },
  {
    "id": "exercise-51",
    "title": "First-Last Character Matching",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the first-last character matching implementation from memory.",
    "language": "C",
    "sourceOrder": 51,
    "code": "// 先比较模式串的第一个字符，再比较模式串的最后一个字符，最后比较模式串中从第二个到第 n-1 个字符。\nint Index_FL(SString S, SString T, int pos) { \n    sLength = S[0]; tLength = T[0]; \n    i = pos; \n    patStartChar = T[1]; patEndChar = T[tLength]; \n    \n    while (i <= sLength – tLength + 1) { \n        if (S[i] != patStartChar) \n            ++i; //重新查找匹配起始点\n        else if (S[i+tLength-1] != patEndChar) \n            ++i; // 模式串的“尾字符”不匹配 \n        else { 检查中间字符的匹配情况 } \n    } // while\n    return 0;\n} // Index_FL\n"
  },
  {
    "id": "exercise-52",
    "title": "KMP String Matching",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the kmp string matching implementation from memory.",
    "language": "C",
    "sourceOrder": 52,
    "code": "int Index_KMP(SString S, SString T, int pos) { \n    // 1 ≤ pos ≤ StrLength(S) \n    i = pos; j = 1; \n    while (i <= S[0] && j <= T[0]) { \n        if (j = 0 || S[i] == T[j]) { ++i; ++j;} // 继续比较后继字符 \n        else j = next[j]; // 模式串向右移动 91 \n    }//while \n    if (j > T[0]) return i-T[0]; // 匹配成功 \n    else return 0; \n} // Index_KMP \n"
  },
  {
    "id": "exercise-53",
    "title": "Compute KMP Next Array",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the compute kmp next array implementation from memory.",
    "language": "C",
    "sourceOrder": 53,
    "code": "void getNext(HString substr, int next[]) {\n    int k = 1, j = 0;\n    next[1] = 0;\n    \n    while (k < subStr.length){\n        if(j == 0 || substr.ch[k] == subStr.ch[j]) {\n            next[k + 1] = j + 1;\n            ++j;  ++k;\n        } // if\n        else j = next[j];\n    } // while\n} // getNext\n"
  },
  {
    "id": "exercise-54",
    "title": "Compute KMP Nextval Array",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the compute kmp nextval array implementation from memory.",
    "language": "C",
    "sourceOrder": 54,
    "code": "void getNextval(HString substr, int next[], int nexxtval[])\n    int k=1, j=0;\n    next[1] = 0;\n    nextval[1] = 0;\n    \n    while (k < subStr.length){\n        if(j == 0 || substr.ch[k] = substr.ch[j]) {\n            next[k + 1] = j + 1;\n            \n            if(subStr.ch[k+1] != subStr.ch[next[k+1]) {\n                nextval[k + 1] = next[k + 1];\n            } // if\n            else {\n                nextval[k + 1] = nextval[next[k + 1];\n            } // else\n            \n            ++k;  ++j;\n        } // if\n        else j = nextval[j];\n    } // while\n} // getNextval\n"
  },
  {
    "id": "exercise-55",
    "title": "Sparse Matrix Triple Structure",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the sparse matrix triple structure implementation from memory.",
    "language": "C",
    "sourceOrder": 55,
    "code": "#define MAXSIZE 12500\n\ntypedef struct {\n    int i, j;  //该非零元的行下标和列下标\n    ElemType e;  //该非零元的值\n}Triple;//三元组类型\n\ntypedef struct {\n    Triple data[MAXSIZE + 1];\n    int mu,nu,tu;\n}TSMatrix;  //稀疏矩阵类型\n"
  },
  {
    "id": "exercise-56",
    "title": "Transpose Sparse Matrix",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the transpose sparse matrix implementation from memory.",
    "language": "C",
    "sourceOrder": 56,
    "code": "Status trans_posemat(TSMatrix M, TSMatrix &T) {\n    // M 是原矩阵,T是转置后的矩阵,Status是函数返回状态(OK=1,ERROR=0)\n    T.mu:=M.nu; T.nu:=M.mu;  //转置后行数=原矩阵列数(\n    T.tu:=M.tu;  //非零元个数不变\n    \n    if(T.tu){  //若有非零元,执行转置\n        q=1;  //q是T.data的下标,从1开始存储\n        for(col=1; col<=M.nu; ++col){  //按原矩阵的列序遍历\n            for(p=l; p<=M.tu : ++p){  //遍历原矩阵的所有非零元\n                if(M.data[p].j=col){  //找到当前列的非零元\n                    T.data[q].i=M.data[p].j;  //交换行下标\n                    T.data[q].j=M.data[p].i;  //交换列下标\n                    T.data[q].e=M.data[p].e;  //复制元素值\n                    q=q+1;  //T的下标后移,保证行序存储\n                } // if\n            } // for\n        } // for\n    } // if\n}\n"
  },
  {
    "id": "exercise-57",
    "title": "Fast Transpose Sparse Matrix",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the fast transpose sparse matrix implementation from memory.",
    "language": "C",
    "sourceOrder": 57,
    "code": "Status fast_trans(TSMatrix M, TSMatrix &T) {\n    T.mu=M.nu:\n    T.nu=M.mu;\n    T.tu=M.tu;\n    \n    if(T.tu){\n        //第一步:初始化num数组,统计每列非零元个数\n        for(col=1; col<=M.nu; col++) num[col]=0;\n        for(t=l;t<=M.tu ; t++) ++num[M.data[t].j];\n        \n        //第二步:计算cpot数组,确定每列第一个非零元在T中的位置\n        cpot[1]=1;\n        for (col=2;col<=M.nu ;++col)\n            cpot[col]=cpot [col-1] + num[col-1];\n            \n        // 第三步:遍历M的三元组,一次完成转置\n        for(p=1;p<=M.tu ;++p){\n            col = M.data[p].j;\n            q = cpot [col];\n            T. data [q] .i = M. data [p] .j;\n            T.data [q] .j = M. data [p] .i;\n            T.data[q].e=M.data[p].e; ++cpot[col];\n        }\n    } // if\n    return OK;\n}\n"
  },
  {
    "id": "exercise-58",
    "title": "Generalized List Structure",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the generalized list structure implementation from memory.",
    "language": "C++",
    "sourceOrder": 58,
    "code": "typedef enum {ATOM, LIST} ElemTag;  // ATOM==0:原子,  LIST==1:子表\n\ntypedef struct GLNode {\n    ElemTag tag;  // 标志域\n    union{\n        AtomType atom; // 原子结点的数据域\n        struct { struct GLNode *hp, *tp } ptr;\n    }\n}*GList;\n"
  },
  {
    "id": "exercise-59",
    "title": "Generalized List Depth",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the generalized list depth implementation from memory.",
    "language": "C",
    "sourceOrder": 59,
    "code": "int GlistDepth(Glist L){\n    // 返回指针L所指的广义表的深度\n    if (!L) return 1:\n    if (L->tag == ATOM) return 0;\n    for (max=0, pp=L; pp; pp = pp->ptr.tp){\n        dep = GlistDepth(pp->ptr.hp);\n        if(dep > max) max = dep;\n    }\n    return max +1;\n}//GlistDepth\n"
  },
  {
    "id": "exercise-60",
    "title": "Copy Generalized List",
    "chapter": "Strings, Arrays & Generalized Lists",
    "description": "Reproduce the copy generalized list implementation from memory.",
    "language": "C",
    "sourceOrder": 60,
    "code": "Status CopyGList(Glist &T, Glist L){\n    if(!L) T = NULL; //复制空表\n    else {\n        if(!(T=newGLNode)) exit(OVERFLOW);  //建表结点\n        T->tag = L->tag;\n        if(L->tag==ATOM)\n            T->atom = L->atom;  //复制单原子结点\n        else\n            CopyGList(T->ptr.hp, L->ptr.hp);  //复制求得表头L->ptr.hp的一个副本T->ptr.hp\n            CopyGList(T->ptr.tp, L->ptr.tp);  //复制求得表尾L->ptr.tp的一个副本T->ptr.tp\n    } //else\n    return OK;\n} // CopyGList\n"
  },
  {
    "id": "exercise-61",
    "title": "Parent Tree Structure",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the parent tree structure implementation from memory.",
    "language": "C",
    "sourceOrder": 61,
    "code": "#define MAXSIZE 100\n\ntypedef struct {\n    ElemType data;\n    int parent;\n} PTNode;\n\ntypedef struct {\n    PTNode nodes[MAXSIZE];\n    int n;\n}PTree;\n"
  },
  {
    "id": "exercise-62",
    "title": "Child List Tree Structure",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the child list tree structure implementation from memory.",
    "language": "C",
    "sourceOrder": 62,
    "code": "//孩子节点链表的单个节点结构: 用于串联某个节点的所有孩子子\ntypedef struct CTNode {\n    int child;  //孩子节点在数组中的下标\n    struct CTNode *next;  //指向下一个孩子节点的指针\n} CTNode, *ChildPtr;\n\n//树的表头节点结构: 每个节点包含数据和第一个孩子的指针\ntypedef struct CTBox{\n    ElemType data;  //节点存储的数据(需提前定义ElemType, 如 typedef int ElemType;)\n    ChildPtr firstChild;  //指向该节点第一个孩子的指针\n} CTBox;\n\n//树的孩子表示法整体结构: 管理所有节点和节点数量\ntypedef struct CTree {\n    CTBox nodes[MAXSIZE];  //存储树所有节点的数组\n    int n;  //树的实际节点个数\n} CTree;\n"
  },
  {
    "id": "exercise-63",
    "title": "Child-Sibling Tree Structure",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the child-sibling tree structure implementation from memory.",
    "language": "C",
    "sourceOrder": 63,
    "code": "typedef struct CSNode {\n    ElemType data;\n    struct CSNode *firstchild, *nextsibling;\n} CSNode, *CSTree;\n"
  },
  {
    "id": "exercise-64",
    "title": "Binary Tree Structure",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the binary tree structure implementation from memory.",
    "language": "C",
    "sourceOrder": 64,
    "code": "typedef struct BiTNode {\n    ElemType data;\n    struct BiTNode *lchild, *rchild;\n} BiTNode, *BiTree;\n"
  },
  {
    "id": "exercise-65",
    "title": "Recursive Preorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the recursive preorder traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 65,
    "code": "void PreOrder(BiTree T) {\n    if (T ! = NULL) {\n        visit(T);\n        PreOrder(T->lchild);\n        PreOrder(T->rchild);\n    }\n}\n"
  },
  {
    "id": "exercise-66",
    "title": "Iterative Preorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the iterative preorder traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 66,
    "code": "void PreOrder2(BiTree T) {\n    InitStack(S);\n    BiTree p = T;\n    \n    while (p || !IsEmpty(S)) {\n        if(p){\n            visit(p);\n            Push(S,p);\n            p = p->lchild;\n        } \n        else {\n            Pop(S,p);\n            p = p->rchild;\n        }\n    }\n}\n"
  },
  {
    "id": "exercise-67",
    "title": "Recursive Inorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the recursive inorder traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 67,
    "code": "void InOrder(BiTree T){\n    if(T!=NULL){\n        InOrder(T->lchild);\n        visit(T);\n        InOrder(T->rchild);\n    }\n}\n"
  },
  {
    "id": "exercise-68",
    "title": "Iterative Inorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the iterative inorder traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 68,
    "code": "void InOrder2(BiTree T){\n    Stack S;\n    InitStack(&S);\n    BiTree p = T;\n    \n    while(p || !IsEmpty(&S)){\n        if(p){\n            Push(&S,p);\n            p = p->lchild;\n        }\n        else{\n            Pop(&S, &p);\n            visit(p);\n            p = p->rchild;\n        }\n    }\n}\n"
  },
  {
    "id": "exercise-69",
    "title": "Recursive Postorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the recursive postorder traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 69,
    "code": "void PostOrder(BiTree T){\n    if(T!=NULL){\n        PostOrder(T->lchild);\n        PostOrder(T->rchild);\n        visit(T);\n    }\n}\n"
  },
  {
    "id": "exercise-70",
    "title": "Iterative Postorder Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the iterative postorder traversal implementation from memory.",
    "language": "C++",
    "sourceOrder": 70,
    "code": "void PostOrder_NonRecursive(BiTree T) {\n    if (T == NULL) return;  //空树直接返回\n    \n    //初始化栈(这里用数组模拟栈,也可用链式栈,核心逻辑一致)\n    StackNode stack[100];\n    int top = -1;  //栈顶指针初始化为-1(空栈)\n    \n    BiTree p = T;\n    //核心循环:结点未遍历完或栈非空时继续\n    while (p != NULL || top != -1) {\n        //1.遍历左子树:将所有左孩子入栈(标记为未访问)\n        while (p != NULL) {\n            stack[++top].node = p;\n            stack[top].is_visited = 0;  //首次入栈,未访问\n            p = p->lchild;  //转向左孩子\n        }\n        \n        //2.取出栈顶元素,判断是否已访问\n        StackNode top_node = stack[top--];  //出栈(先取后减)\n        p = top_node.node;\n        \n        if(top_node.is_visited == 0) { \n            stack[++top].node = p;  //首次访问:不输出,重新入栈(标记为已访问),再遍历右子树\n            stack[top].is_visited = 1;  //标记为已访问\n            p = p->rchild;  //转向右孩子\n        } \n        else { \n            printf(\"%d \", p->data);  //二次访问:右子树已遍历完成,输出根结点(后序遍历核心)\n            p = NULL;  //置空,避免再次遍历左子树 \n        }\n    } // while\n} // PostOrder_NonRecursive\n"
  },
  {
    "id": "exercise-71",
    "title": "Level Order Traversal",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the level order traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 71,
    "code": "void LevelOrder(BiTree T){\n    Queue Q;\n    InitQueue(&Q);\n    BiTree p;\n    EnQueue(&Q, T);\n    \n    while(!IsEmpty(&Q)){\n        DeQueue(&Q, &p);\n        visit(p);\n        if(p->lchild != NULL)\n            EnQueue(&Q, p->lchild);\n        if(p->rchild != NULL)\n            EnQueue(&Q, p->rchild);\n    }\n}\n"
  },
  {
    "id": "exercise-72",
    "title": "Threaded Binary Tree Structure",
    "chapter": "Trees & Binary Trees",
    "description": "Reproduce the threaded binary tree structure implementation from memory.",
    "language": "C",
    "sourceOrder": 72,
    "code": "typedef struct ThreadNode{\n    ElemType data;\n    struct ThreadNode *lchild, *rchild;\n    int ltag, rtag;\n}ThreadNode, *ThreadTree;\n"
  },
  {
    "id": "exercise-73",
    "title": "Graph Adjacency Matrix",
    "chapter": "Graphs",
    "description": "Reproduce the graph adjacency matrix implementation from memory.",
    "language": "C",
    "sourceOrder": 73,
    "code": "//用两个数组分别存储顶点表和邻接矩阵\n#define MaxVertexNum 100  //最大顶点数\ntypedef char VertexType; //假设顶点的数据类型为字符型\ntypedef int EdgeType; //假设边的权值类型为整型\n\ntypedef struct{\n    VertexType vexs[MaxVertexNum]; //顶点表\n    EdgeType Edge[MaxVertexNum][MaxVertexNum]; //邻接矩阵\n    int vexnum, arcnum; //图的当前点数和边数\n}MGraph;\n"
  },
  {
    "id": "exercise-74",
    "title": "Graph Adjacency List",
    "chapter": "Graphs",
    "description": "Reproduce the graph adjacency list implementation from memory.",
    "language": "C",
    "sourceOrder": 74,
    "code": "#define MaxVertexNum 100 //最大顶点数\n\ntypedef struct ArcNode{  //边结点\n    int adjvex;  //该边所指向的顶点的位置\n    struct ArcNode *next; //指向下一条边的指针\n    OtherInfo info; //和边相关的信息(网的权值)\n}ArcNode;\n\ntypedef struct VNode{  //顶点表结点\n    VertexType data;   //顶点信息\n    ArcNode *first;    //指向第一条依附该顶点的边的指针\n}VNode, AdjList[MaxVertexNum];   //AdjList表示邻接表类型\n\ntypedef struct{\n    AdjList vertices;  //邻接表\n    int vexnum, arcnum;  //图的当前顶点数和边数\n}ALGraph;\n// 时间复杂度 O(1)\n"
  },
  {
    "id": "exercise-75",
    "title": "Graph Orthogonal List",
    "chapter": "Graphs",
    "description": "Reproduce the graph orthogonal list implementation from memory.",
    "language": "C",
    "sourceOrder": 75,
    "code": "#define MaxVertexNum 100  //最大顶点数\n\ntypedef struct ArcNode{  //边结点\n    int tailvex, headvex;  //该弧所指向的顶点的位置\n    struct ArcNode *hlink, *tlink;  //指向下一条相同弧头、尾的指针\n    OtherInfo info;  //和边相关的信息(网的权值)\n}ArcNode;\n\ntypedef struct VNode{  //顶点表结点\n    VertexType data;  //顶点信息\n    ArcNode *firstin, *firstout;  //指向第一条依附该顶点的弧头、尾指针\n}VNode;\n\ntypedef struct{\n    Vnode xlist[MaxVertexNum];  //邻接表\n    int vexnum,arcnum;  //图的当前顶点数和边数\n}GLGraph;\n"
  },
  {
    "id": "exercise-76",
    "title": "Graph Adjacency Multilist",
    "chapter": "Graphs",
    "description": "Reproduce the graph adjacency multilist implementation from memory.",
    "language": "C++",
    "sourceOrder": 76,
    "code": "#define MaxVertexNum 100  //最大顶点数\n\ntypedef struct ArcNode{  //边结点\n    int visited,ivex, jvex;  //该边所指向的两个顶点的位置,是否访问过\n    struct ArcNode *ilink, *jlink;  //指向下一条边相同顶点的指针\n    OtherInfo info;  //和边相关的信息(网的权值)\n}ArcNode;\n\ntypedef struct VNode{  //顶点表结点\n    VertexType data;  //顶点信息\n    ArcNode *firstedge;  //指向第一条依附该顶点的边指针\n}VNode;\n\ntypedef struct{\n    Vnode adjmulist[MaxVertexNum];  //邻接表\n    int vexnum, arcnum;  //图的当前顶点数和边数\n}AMLGraph;\n"
  },
  {
    "id": "exercise-77",
    "title": "Depth-First Graph Traversal",
    "chapter": "Graphs",
    "description": "Reproduce the depth-first graph traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 77,
    "code": "bool visited[Max_Vex];  //访问标记数组\n\nvoid DFSTraverse(Graph G){\n    for (i=0; i<G.vexnum; ++i)\n        visited[i] = false;  //初始化标记数组\n        \n    for(v=0; v<G.vexnum; ++v)\n        if (!visited[v])  //如果v未被访问,则从v起开始遍历\n            DFS(G, v);\n}\n\nvoid DFS(Graph G, int v){\n    visit(v); visited[v] = true;  //访问结点并更改标记\n    \n    for (w = FirstNeighbor(G, v); w >= 0; w = NextNeighbor(G, v, w))\n        if (!visited[w])\n            DFS(G, w);\n}\n"
  },
  {
    "id": "exercise-78",
    "title": "Breadth-First Graph Traversal",
    "chapter": "Graphs",
    "description": "Reproduce the breadth-first graph traversal implementation from memory.",
    "language": "C",
    "sourceOrder": 78,
    "code": "bool visited[Max_Vex];  //访问标记数组\n\nvoid BFSTraverse(Graph G){\n    for (i=0; i<G.vexnum; ++i)\n        visited[i] = false;  //初始化标记数组\n    InitQueue(Q);\n    for(v=0; v<G.vexnum; ++v)\n        if (!visited[v])  //如果v未被访问,则从v起开始遍历\n            BFS(G, v);\n}\n\nvoid BFS (Graph G, int v){\n    visit(v); visited[v] = true; EnQueue(Q, v);  //访问结点并将结点入队\n    while (!isEmpty(Q)){\n        DeQueue(Q, v);\n        for (w = FirstNeighbor(G, v); w >= 0; W = NextNeighbor(G, v, w))\n            if (!visited[w]){\n                visit(w); visited[w] = true; EnQueue(Q, w);\n            }\n    }\n}\n"
  },
  {
    "id": "exercise-79",
    "title": "Sequential Search",
    "chapter": "Search",
    "description": "Reproduce the sequential search implementation from memory.",
    "language": "C",
    "sourceOrder": 79,
    "code": "typedef struct{\n    ElemType *R;  //表基址\n    int length;   //表长\n}SSTable;\n\nint LocateELem(SqList L, ElemType e)\n    for (i=0; i<L.length; i++)\n        if (L.elem[i] == e) \n            return i+1;\n    return 0;\n}\n\n// 改进：把待查关键字 key 存入表头(“哨兵”)，从后向前逐个比较，可免去查找过程中每一步都要检测是否查找完毕，加快速度\nint Search_Seq(SSTable ST, KeyType key ){\n    //若成功返回其位置信息，否则返回 0\n    ST.R[0].key =key;\n    for(i = ST.length; ST.R[i].key!=key; --i);   //不用 for(i=n;i>0;--i) 或 for(i=1;i<=n;i++)\n    return i;\n}\n"
  },
  {
    "id": "exercise-80",
    "title": "Binary Search",
    "chapter": "Search",
    "description": "Reproduce the binary search implementation from memory.",
    "language": "C",
    "sourceOrder": 80,
    "code": "int Search_Bin(SSTable ST,KeyType key) \n{ \n    //若找到，则函数值为该元素在表中的位置，否则为 0 \n    low=1; high=ST.length; \n    while(low<=high){ \n        mid = (low+high)/2; \n        if(key==ST.R[mid].key) return mid;\n        else if(key<ST.R[mid].key) high=mid-1; //前一子表查找\n        else low=mid+1;  //后一子表查找 \n    } \n    return 0;  //表中不存在待查元素 \n}\n"
  },
  {
    "id": "exercise-81",
    "title": "Binary Search Tree Search",
    "chapter": "Search",
    "description": "Reproduce the binary search tree search implementation from memory.",
    "language": "Java",
    "sourceOrder": 81,
    "code": "BSTree SearchBST(BSTree T,KeyType key) \n{ \n    if((!T) || key==T->data.key) return T;\n    else if (key < T->data.key) return SearchBST(T->lchild, key);  //在左子树中继续查找 \n    else return SearchBST(T->rchild, key);  //在右子树中继续查找 \n} // SearchBST\n"
  },
  {
    "id": "exercise-82",
    "title": "Straight Insertion Sort",
    "chapter": "Sorting",
    "description": "Reproduce the straight insertion sort implementation from memory.",
    "language": "C",
    "sourceOrder": 82,
    "code": "void InsertSort(SqList ＆L) {\n    int i,j; \n    for(i=2;i<=L.length;++i) \n        if( L.r[i].key<L.r[i-1].key)//将 L.r[i]插入有序子表 \n        { \n            L.r[0] = L.r[i];// 复制为哨兵 \n            L.r[i] = L.r[i-1]; \n            for(j=i-2;L.r[0].key<L.r[j].key; --j) \n                L.r[j+1]=L.r[j];// 记录后移 \n            L.r[j+1]=L.r[0];//插入到正确位置 \n        } \n}\n"
  },
  {
    "id": "exercise-83",
    "title": "Binary Insertion Sort",
    "chapter": "Sorting",
    "description": "Reproduce the binary insertion sort implementation from memory.",
    "language": "C",
    "sourceOrder": 83,
    "code": "void BInsertSort ( SqList &L ) { \n    for ( i = 2; i <= L.length; ++i ) { \n        L.r[0] = L.r[i]; \n        low = 1; \n        high = i-1; \n        \n        while ( low <= high ) {\n            m = ( low + high ) / 2 ; \n            if ( L.r[0].key < L.r[m]. key )  high = m -1 ; \n            else low = m + 1; \n        } \n        \n        for ( j=i-1; j>=high+1; --j ) \n            L.r[j+1] = L.r[j]; \n            \n        L.r[high+1] = L.r[0]; \n    } \n} // BInsertSort\n"
  },
  {
    "id": "exercise-84",
    "title": "Shell Sort",
    "chapter": "Sorting",
    "description": "Reproduce the shell sort implementation from memory.",
    "language": "C",
    "sourceOrder": 84,
    "code": "void  ShellSort(SqList &L，int dlta[]，int t){ \n    //按增量序列 dlta[0…t-1]对顺序表 L 作 Shell 排序 \n    for(k=0; k<t; ++k) \n        ShellInsert(L，dlta[k]); //增量为dlta[k]的一趟插入排序 \n} // ShellSort \n\nvoid ShellInsert(SqList &L，int dk) { \n    //对顺序表 L 进行一趟增量为 dk 的 Shell 排序，dk 为步长因子 \n    for(i=dk+1;i<=L.length; ++i){  //开始将 r[i] 插入有序增量子表 \n        if(r[i].key < r[i-dk].key){ \n            r[0]=r[i]; //暂存在 r[0] \n            for(j=i-dk;j>0 &&(r[0].key<r[j].key);j=j-dk) \n                r[j+dk]=r[j]; //关键字较大的记录在子表中后移 \n            r[j+dk]=r[0]; //在本趟结束时将 r[i]插入到正确位置 \n        } \n    }\n}\n"
  },
  {
    "id": "exercise-85",
    "title": "Bubble Sort",
    "chapter": "Sorting",
    "description": "Reproduce the bubble sort implementation from memory.",
    "language": "C++",
    "sourceOrder": 85,
    "code": "void main() { \n    int a[11];  //a[0]不用，只用 a[1]~a[10]\n    int i,j,t; \n    \n    printf(\"\\nInput 10 numbers： \\n\"); \n    for(i=1;i<=10;i++){ \n        scanf(\"%d\",&a[i]); \n        printf(\"\\n\"); \n    }\n    \n    for(j=1;j<=9;j++) \n        for(i=1;i<=10-j;i++) \n            if(a[i]>a[i+1]){\n                t=a[i];\n                a[i]=a[i+1];\n                a[i+1]=t;\n            } //交换 \n            \n    for(i=1;i<=10;i++) \n        printf(\"%d \",a[i]); \n} //main\n\nvoid bubble_sort(SqList &L){ \n    int m,i,j,flag=1;\n    RedType x; \n    m=L.length-1; \n    \n    while((m>0) && (flag==1)){ \n        flag=0; \n        for(j=1; j<=m; j++) \n            if(L.r[j].key > L.r[j+1].key){ \n                flag=1; \n                x=L.r[j]; L.r[j]=L.r[j+1]; L.r[j+1]=x;//交换 \n            }//endif \n        m--; \n    }//endwhile \n}\n"
  },
  {
    "id": "exercise-86",
    "title": "Quick Sort",
    "chapter": "Sorting",
    "description": "Reproduce the quick sort implementation from memory.",
    "language": "Java",
    "sourceOrder": 86,
    "code": "void main(){ \n    QSort ( L, 1, L.length );\n} \n\nvoid QSort ( SqList &L，int low, int high ) { \n    if ( low < high ) {  //划分操作将 A[n]划分为满足条件的两个子表 \n        pivotloc = Partition(L, low, high ) ; \n        Qsort (L, low, pivotloc-1) ; //对两个子表递归调用快速排序 \n        Qsort (L, pivotloc+1, high ) ; \n    } \n} \n\nint Partition ( SqList &L，int low, int high ) {\n    L.r[0] = L.r[low]; pivotkey = L.r[low].key; //设第一个元素为基准值 \n    while ( low < high ){ \n        while ( low < high && L.r[high].key >= pivotkey ) \n            --high; \n        L.r[low] = L.r[high];  //将比基准值小的元素移动到左端 \n        \n        while ( low < high && L.r[low].key <= pivotkey ) \n            ++low; \n        L.r[high] = L.r[low];  //将比基准值大的元素移动到右端 \n    } \n    L.r[low]=L.r[0];  //基准元素放到最终位置 \n    return low;  //返回基准元素的最终位置 \n}\n"
  },
  {
    "id": "exercise-87",
    "title": "Simple Selection Sort",
    "chapter": "Sorting",
    "description": "Reproduce the simple selection sort implementation from memory.",
    "language": "C",
    "sourceOrder": 87,
    "code": "void SelectSort(SqList &K) { \n    for (i=1; i<L.length; ++i){ //在 L.r[i..L.length] 中选择 key 最小的记录 \n        k=i; \n        for( j=i+1; j<=L.length;j++) \n            if ( L.r[j].key <L.r[k].key) k=j; \n        if(k!=i) swap(L.r[i],L.r[k]);\n    }\n}\n"
  }
];
